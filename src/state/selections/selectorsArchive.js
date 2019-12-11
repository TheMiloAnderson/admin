import { createSelector } from 'reselect';
import { get116thCongress } from '../mocs/selectors';
import { getResearchersEmailById } from '../researchers/selectors';
import {
  includes,
  filter,
  map, 
  orderBy,
  reduce,
  uniq,
} from 'lodash';
import moment from 'moment-timezone';
import {
  DATE_TIMESTAMP,
  DATE_OBJ,
  DATE_CREATED
} from '../../constants';
import {
  getAllOldEventsWithUserEmails,
  getAllFederalAndStateLiveEvents,
} from '../events/selectors';

export const getDateRange = state => state.selections.dateLookupRange;
export const getOldEventsActiveFederalOrState = state => state.selections.federalOrStateOldEvents;
export const getStatesToFilterArchiveBy = state => state.selections.filterByState;
export const includeLiveEventsInLookup = state => state.selections.includeLiveEvents;
export const getChamber = state => state.selections.filterByChamber;
export const getLegislativeBody = state => state.selections.filterByLegislativeBody;
export const getEventTypes = state => state.selections.filterByEventType;
export const getNameFilter = state => state.selections.filterByName;
export const getResearcherFilter = state => state.selections.filterByResearcher;
export const getDateLookupType = state => state.selections.dateLookupType;

export const normalizeEventSchema = eventData => {
  let normalizedEvent = {};

  normalizedEvent.editable = eventData.editable;
  normalizedEvent.errorMessage = (() => {
    if (eventData.error) {
      return `${eventData.error.dataPath} ${eventData.error.message}`;
    }
    return ' ';
  })();

  normalizedEvent.eventId = eventData.eventId;
  normalizedEvent.enteredBy = eventData.enteredBy || eventData.userEmail;  
  normalizedEvent.eventName = eventData.eventName ? eventData.eventName : ' ';
  normalizedEvent.displayName = eventData.displayName || eventData.Member;
  normalizedEvent.officePersonId = eventData.officePersonId || ' ';
  normalizedEvent.meetingType = eventData.meetingType || ' ';

  normalizedEvent.location = eventData.location ? eventData.location : eventData.Location ? eventData.Location : ' ';
  normalizedEvent.address = eventData.address || ' ';
  normalizedEvent.lat = eventData.lat || ' ';
  normalizedEvent.lng = eventData.lng || ' ';

  normalizedEvent.govtrack_id = eventData.govtrack_id || 0;
  normalizedEvent.party = eventData.party || ' ';
  normalizedEvent.level = eventData.level || ' ';
  normalizedEvent.chamber = eventData.chamber || ' ';
  normalizedEvent.state = eventData.state || ' ';
  normalizedEvent.district = eventData.district;
  
  normalizedEvent.timestamp = eventData.timestamp || eventData.dateObj;
  normalizedEvent.timeStart = eventData.timeZone ? moment(eventData.timeStart).tz(eventData.timeZone).format('MMMM Do YYYY, h:mm a z') : eventData.timeStart || moment(eventData.dateObj).toISOString();
  // Live events in Firebase currently store timeEnd as human-readable strings, e.g. "12:00 PM", instead of ISO-8601
  normalizedEvent.timeEnd = eventData.timeEnd || ' ';
  normalizedEvent.timeZone = eventData.timeZone || ' ';
  normalizedEvent.dateValid = eventData.dateValid || false;
  normalizedEvent.validated = eventData.validated || false;
  normalizedEvent.ada_accessible = eventData.ada_accessible || false;

  normalizedEvent.error = eventData.error || false;

  normalizedEvent.notes = (() => {
    if (eventData.Notes) {
      return eventData.Notes.replace(/"/g, '\'');
    }
    if (eventData.notes) {
      return eventData.notes.replace(/"/g, '\'');
    }
    return ' ';
  })();

  normalizedEvent.link = eventData.link || 'https://townhallproject.com/?eventId=' + eventData.eventId;

  normalizedEvent.iconFlag = eventData.iconFlag || ' ';
  normalizedEvent.dateCreated = eventData.dateCreated || ' ';
  // Live events in Firebase store lastUpdated as a timestamp. Archived events in Firestore use ISO-8601.
  normalizedEvent.lastUpdated = moment(eventData.lastUpdated).toISOString();
  normalizedEvent.internalNotes = eventData.internalNotes || ' ';

  return normalizedEvent;
}

export const getAllEventsForAnalysis = createSelector([
  includeLiveEventsInLookup, 
  getAllOldEventsWithUserEmails, 
  getAllFederalAndStateLiveEvents,
  getDateRange,
  getDateLookupType,
], (includeLive, oldEvents, liveEvents, dateRange, dateLookupType) => {
  oldEvents = map(oldEvents, (event) => {
    event.editable = true;
    return event;
  });
  
  if (dateLookupType === DATE_CREATED) {
    oldEvents = filter(oldEvents, (event) => {
      if (event[DATE_CREATED]){
        console.log('date created', event[DATE_CREATED])
        let date = moment(event[DATE_CREATED]).valueOf();
        console.log(date, date >= dateRange[0] && date <= dateRange[1]);
        return date >= dateRange[0] && date <= dateRange[1]

      } 
      let date = moment(event.lastUpdated).valueOf();
      console.log('using last updated', date >= dateRange[0] && date <= dateRange[1])
      return date >= dateRange[0] && date <= dateRange[1]
    });
  }

  if (includeLive) {
    liveEvents = filter(liveEvents, (event) => {
      const dateKey = dateLookupType === DATE_TIMESTAMP ? DATE_OBJ : dateLookupType;
      let date;
      if (event[dateKey] && moment(event[dateKey]).isValid()) {
        date = moment(event[dateKey]).valueOf();
      } else if (!event[dateKey] && event.dateString && dateKey === DATE_OBJ) {
        date = moment(event.dateString).valueOf();
      } else {
        return false;
      }
      return date >= dateRange[0] && date <= dateRange[1]
    });
    liveEvents = map(liveEvents, (event) => {
      event.editable = false;
      return event;
    });
    return [...oldEvents, ...liveEvents];
  }
  return oldEvents;
});

export const getFilteredEvents = createSelector(
  [
    getAllEventsForAnalysis,
    getStatesToFilterArchiveBy,
    getChamber,
    getEventTypes,
    getLegislativeBody,
    getNameFilter,
    getResearcherFilter,
    getResearchersEmailById,
  ], 
  (allEvents, states, chamber, events, legislativeBody, name, researcherEmail, researchersEmailById) => {
    let filteredEvents = allEvents;
    filteredEvents = map(filteredEvents, normalizeEventSchema);

    if (states.length) { 
      filteredEvents = filter(filteredEvents, (event) => {
        return includes(states, event.state);
      });
    }
    if (chamber !== "all") {
      filteredEvents = filter(filteredEvents, (event) => {
        return chamber === event.chamber;
      });
    }
    if (events.length > 0) {
      filteredEvents = filter(filteredEvents, (event) => {
        return includes(events, event.meetingType);
      });
    }
    filteredEvents = filter(filteredEvents, (event) => {
      if (legislativeBody === 'federal') {
        return event.level === 'federal' || event.level === ' ';
      }
      return event.level === 'state' && event.state === legislativeBody;
    });
    if (name) {
      filteredEvents = filter(filteredEvents, (event) => {
        return name === event.displayName;
      });
    }
    if (researcherEmail) {
      filteredEvents = filter(filteredEvents, (event) => {
        return researcherEmail === researchersEmailById[event.enteredBy];
      })
    }
    filteredEvents = orderBy(filteredEvents, ['timestamp'], ['desc']);
    return filteredEvents;
  },
);

export const getReturnedStateEventsLength = createSelector(
  [getAllEventsForAnalysis], (allEvents) => filter(allEvents, (event) => event.level === "state").length
);

export const getReturnedErrorEventsLength = createSelector(
  [getAllEventsForAnalysis], (allEvents) => filter(allEvents, (event) => event.error).length
);

export const getTotalUnFilteredOldEventsCount = createSelector(
  [getAllEventsForAnalysis], (totalEvents) => totalEvents.length
);

export const getFilteredUniqueNames = createSelector([getFilteredEvents], (allEvents) => {
  const allNames = map(allEvents, (eventData) => {
    return eventData.displayName;
  });
  return [...new Set(allNames)];
});

export const getFilteredOldEventsLength = createSelector(
  [getFilteredEvents], (filtered) => filtered.length
);

export const getEventsAsDownloadObjects= createSelector([getFilteredEvents], (allEvents) => {
  return map(allEvents, (eventData) => {
    // Future: Customize normalizedEvent > CSV field mappings if desired
    return eventData;
  });
});

export const getDataForArchiveChart = createSelector(
  [getFilteredEvents],
  (allEvents) => {
    if (!allEvents || !allEvents.length) {
      return [];
    }
    return map(reduce(allEvents, (acc, cur) => {
      const party = cur.party ? cur.party.substring(0, 1) : 'None';
      if (acc[party] >= 0) {
        acc[party] = acc[party] + 1;
      }
      return acc;
    }, {
      D: 0,
      R: 0,
      I: 0,
      None: 0,
    }), (value, key) => {
      return {
        party: key,
        value
      }
    })
  }
);

export const get116MissingMemberReport = createSelector([getFilteredEvents, get116thCongress], (events, mocs) => {
  return map(mocs, (moc) => {
    const eventsForMoc = filter(events, { govtrack_id: moc.govtrack_id });
    const hasEvent = filter(eventsForMoc, { meetingType: 'Town Hall' });
    const eventTypes = uniq(map(eventsForMoc, 'meetingType'));
    return {
      memberId: moc.govtrack_id,
      hasEvent: hasEvent.length > 0,
      name: moc.displayName,
      party: moc.party,
      chamber: moc.chamber,
      state: moc.state,
      district: moc.district || '',
      number_of_town_halls: hasEvent.length,
      type_of_events: eventTypes,
      eventIds: eventsForMoc.map(event => event.eventId),
    }
  })
});

export const get116CongressSenateResults = createSelector([get116MissingMemberReport], (mocs) => {
  const allInChamber = filter(mocs, {chamber: 'upper'});
  return reduce(allInChamber, (acc, cur) => {
    if (cur.hasEvent) {
      if (cur.party[0].toLowerCase() === 'd') {
        acc.dEvents ++;
      } else if (cur.party[0].toLowerCase() === 'r') {
        acc.rEvents++;
      } else {
        acc.otherEvents++;
      }
    } else {
      if (cur.party[0].toLowerCase() === 'd') {
        acc.dMissing++;
      } else if (cur.party[0].toLowerCase() === 'r') {
        acc.rMissing++;
      } else {
        acc.otherMissing++;
      }
    }
    return acc;
  }, {
    dMissing: 0,
    dEvents: 0,
    rMissing: 0,
    rEvents: 0,
    otherMissing: 0,
    otherEvents: 0,
  })
});

export const get116CongressHouseResults = createSelector([get116MissingMemberReport], (mocs) => {
  const allInChamber = filter(mocs, {
    chamber: 'lower'
  });
  return reduce(allInChamber, (acc, cur) => {
    if (cur.hasEvent) {
      if (cur.party[0].toLowerCase() === 'd') {
        acc.dEvents++;
      } else if (cur.party[0].toLowerCase() === 'r') {
        acc.rEvents++;
      } else {
        acc.otherEvents++;
      }
    } else {
      if (cur.party[0].toLowerCase() === 'd') {
        acc.dMissing++;
      } else if (cur.party[0].toLowerCase() === 'r') {
        acc.rMissing++;
      } else {
        acc.otherMissing++;
      }
    }
    return acc;
  }, {
    dMissing: 0,
    dEvents: 0,
    rMissing: 0,
    rEvents: 0,
    otherMissing: 0,
    otherEvents: 0,
  })
});

export const getCongressReport = createSelector(
  [get116CongressSenateResults, get116CongressHouseResults], (senateCount, houseCount) => {
      return map(senateCount, (value, key) => {
        return [{
          x: 'senate',
          y: value,
        },
        {
          x: 'house',
          y: houseCount[key],
        },
      ]
    });
});
