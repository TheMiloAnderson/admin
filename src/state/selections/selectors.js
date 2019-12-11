import { createSelector } from 'reselect';
import {
  includes,
  filter,
  map,
} from 'lodash';
import moment from 'moment-timezone';
import { 
  LIVE_EVENTS_TAB, 
  PENDING_EVENTS_TAB, 
  STATES_LEGS, 
  FEDERAL_RADIO_BUTTON,
} from '../../constants';
import {
  getAllEvents,
} from '../events/selectors';
import {
  getCurrentUser,
} from '../users/selectors';


export const getPendingOrLiveTab = state => state.selections.selectedEventTab;
export const getActiveFederalOrState = state => state.selections.federalOrState;
export const getMode = state => state.selections.mode;
export const getCurrentHashLocation = state => state.selections.currentHashLocation;
export const getTempAddress = state => state.selections.tempAddress;

export const getLiveEventUrl = createSelector([getActiveFederalOrState], (federalOrState) => {
  if (federalOrState !== FEDERAL_RADIO_BUTTON) {
    return `state_townhalls/${federalOrState}`;
  }
  return 'townHalls';
});

export const getSubmissionUrl = createSelector([getActiveFederalOrState], (federalOrState) => {
  if (federalOrState !== FEDERAL_RADIO_BUTTON) {
    return `state_legislators_user_submission/${federalOrState}`;
  }
  return 'UserSubmission';
});

export const getArchiveUrl = createSelector([getActiveFederalOrState], (federalOrState) => {
  if (federalOrState !== FEDERAL_RADIO_BUTTON) {
    return `archived_state_town_halls/${federalOrState}`;
  }
  return 'archived_town_halls';
});

export const getEventsToShowUrl = createSelector([getPendingOrLiveTab, getSubmissionUrl, getLiveEventUrl], 
    (liveOrPending, submissionUrl, liveEventUrl) => {
    if (liveOrPending === LIVE_EVENTS_TAB) {
        return liveEventUrl
    } else if (liveOrPending === PENDING_EVENTS_TAB) {
        return submissionUrl
    }
    return null;
});

export const getPeopleNameUrl = createSelector([getActiveFederalOrState, getMode], (federalOrState, mode) => {
  if (mode === 'candidate') {
    if (includes(STATES_LEGS, federalOrState)) {
      return `state_candidate_keys/${federalOrState}`;
    }
    return 'candidate_keys';
  }
  if (includes(STATES_LEGS, federalOrState)) {
    return `state_legislators_id/${federalOrState}`;
  }
  return 'mocID';
});

export const getPeopleDataUrl = createSelector([getActiveFederalOrState, getMode], (federalOrState, mode) => {
  if (mode === 'candidate') {
    return 'candidate_data';
  }
  if (includes(STATES_LEGS, federalOrState)) {
    return `state_legislators_data/${federalOrState}`;
  }
  return 'mocData';
});

export const getEventsForDownload = createSelector([getAllEvents], (allEvents) => {
  return map(allEvents, eventData => {
    const convertedTownHall = {};
    convertedTownHall.Member = eventData.displayName || eventData.Member;
    convertedTownHall.Chamber = eventData.chamber;
    convertedTownHall.Event_Name = eventData.eventName ? eventData.eventName : ' ';
    convertedTownHall.Location = eventData.Location ? eventData.Location : ' ';
    convertedTownHall.Meeting_Type = eventData.meetingType;
    let district = eventData.district ? '-' + eventData.district : ' ';
    convertedTownHall.District = eventData.state + district;
    convertedTownHall.govtrack_id = eventData.govtrack_id || ' ';
    convertedTownHall.Party = eventData.party;
    convertedTownHall.State = eventData.state;
    convertedTownHall.State_name = eventData.stateName ? eventData.stateName : eventData.State;
    if (eventData.repeatingEvent) {
      convertedTownHall.Repeating_Event = eventData.repeatingEvent;
      convertedTownHall.Date = ' ';
    } else if (eventData.dateString) {
      convertedTownHall.Repeating_Event = ' ';
      convertedTownHall.Date = eventData.dateString;
    } else {
      convertedTownHall.Repeating_Event = ' ';
      convertedTownHall.Date = moment(eventData.dateObj).format('ddd, MMM D YYYY');
    }
    convertedTownHall.Time_Start = eventData.Time;
    convertedTownHall.Time_End = eventData.timeEnd || ' ';
    convertedTownHall.Time_Zone = eventData.timeZone || ' ';
    convertedTownHall.Zone_ID = eventData.zoneString || ' ';
    convertedTownHall.Address = eventData.address;
    convertedTownHall.Notes = eventData.Notes ? eventData.Notes.replace(/"/g, '\'') : ' ';
    convertedTownHall.Map_Icon = eventData.iconFlag;
    convertedTownHall.Link = eventData.link || 'https://townhallproject.com/?eventId=' + eventData.eventId;
    convertedTownHall.Link_Name = eventData.linkName || ' ';
    convertedTownHall.dateNumber = eventData.yearMonthDay;
    convertedTownHall.Last_Updated = moment(eventData.lastUpdated).format('MMM D YYYY, h:mm a');
    return convertedTownHall;
  });
});

export const getNewEventsForDownload = createSelector(
  [getEventsForDownload, getCurrentUser], 
  (allEvents, user) => {
    return filter(allEvents, (event) => {
      return !user.last_event_download || 
      moment(event.Last_Updated, 'MMM D YYYY, h:mm a').valueOf() > user.last_event_download;
  });
});
