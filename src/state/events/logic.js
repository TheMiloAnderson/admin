import { createLogic } from "redux-logic";
import superagent from 'superagent';
import { includes } from 'lodash';
import moment from 'moment';
import { 
  ARCHIVE_COLLECTION,
  DELETE_EVENT,
  DELETE_EVENT_FAIL,
  REQUEST_EVENTS, 
  REQUEST_EVENTS_FAILED,
  REQUEST_EVENTS_COUNTS_FAIL,
  REQUEST_EVENTS_COUNTS,
  REQUEST_TOTAL_EVENTS_COUNTS,
  ARCHIVE_EVENT,
  APPROVE_EVENT,
  APPROVE_EVENT_FAIL,
  REQUEST_OLD_EVENTS,
  UPDATE_EXISTING_EVENT,
  UPDATE_EVENT_SUCCESS,
  UPDATE_OLD_EVENT_SUCCESS,
  UPDATE_EVENT_FAIL,
  UPDATE_OLD_EVENT,
  REQUEST_LIVE_EVENTS_FOR_ARCHIVE,
  RECEIVE_ALL_LIVE_EVENTS_FOR_ANALYSIS,
  GENERAL_FAIL,
  VALIDATE_AND_SAVE_OLD_EVENT,
  VALIDATE_AND_SAVE_OLD_EVENT_SUCCESS,
} from "./constants";
import { 
  EVENTS_PATHS,
  ARCHIVE_MANAGER_URL,
  ARCHIVE_MANAGER_DEV_URL,
} from '../constants';
import {
  PENDING_EVENTS_TAB, DATE_CREATED,
} from '../../constants'
import {
  addAllOldEventsToState,
  setLoading,
  storeEventsInState,
  clearEventsCounts,
  requestFederalEventsCountsSuccess,
  requestStateEventsCountsSuccess,
  requestFederalTotalEventsCountsSuccess,
  requestStateTotalEventsCountsSuccess,
  approveEventSuccess,
  deleteEventSuccess,
  archiveEventSuccess,
} from "./actions";
import {
  requestResearcherById,
} from "../researchers/actions";
import { getDateLookupType } from "../selections/selectorsArchive";

require('dotenv').config();

const fetchEvents = createLogic({
  type: REQUEST_EVENTS,
  process(deps, dispatch, done) {
      const {
        action,
        firebasedb,
    } = deps;
    const { payload } = action;
    if (!payload) {
      return [];
    }
    return firebasedb.ref(`${payload}`).once('value')
      .then((snapshot) => {
        const allData = [];
        const allUids = [];
        snapshot.forEach((ele) => {
          const event = ele.val();
          const researcher = event.enteredBy;
          if (researcher && !includes(researcher, '@')) {
            if (!includes(allUids, researcher)) {
              dispatch(requestResearcherById(researcher))
            }
            allUids.push(researcher);
          }
          allData.push(ele.val())
        })
        dispatch(storeEventsInState(allData));
      })
      .then(done)
  }
});

const fetchFederalAndStateLiveEvents = createLogic({
  type: REQUEST_LIVE_EVENTS_FOR_ARCHIVE,
    processOptions: {
      successType: RECEIVE_ALL_LIVE_EVENTS_FOR_ANALYSIS,
      failType: GENERAL_FAIL,
    },
  process(deps) {
    const {
      firebasedb,
    } = deps;
    const getEventsPromises = [firebasedb.ref('state_townhalls').once('value'), firebasedb.ref('townHalls').once('value')];
    return Promise.all(getEventsPromises).then((returned) => {
      const allEvents = [];
      const stateSnapshot = returned[0];
      const federalSnapshot = returned[1];
      stateSnapshot.forEach((stateEndpoint) => {
        stateEndpoint.forEach((ele) => {
          const e = ele.val();
          e.level = 'state';
          allEvents.push(e);
        })
      })
      federalSnapshot.forEach((event) => {
        const e = event.val();
        e.level = 'federal';
        allEvents.push(e);
      })
      return allEvents;
  })
  }
})

const fetchOldEventsLogic = createLogic({
  type: REQUEST_OLD_EVENTS,
  processOptions: {
    failType: REQUEST_EVENTS_FAILED,
  },
  process({
      getState,
      action,
      firestore
    }, dispatch, done) {
    const {
      payload
    } = action;
    let fsRef = firestore.collection(ARCHIVE_COLLECTION);
    const state = getState();
    const dateKey = getDateLookupType(state);
    let fsQueryRef;
    if (dateKey === DATE_CREATED) {
      fsQueryRef = fsRef
      .orderBy('timestamp')
    } else {
      fsQueryRef = fsRef
        .where('timestamp', '>=', payload.dates[0])
        .where('timestamp', '<=', payload.dates[1])
        .orderBy('timestamp')

    }
    dispatch(setLoading(true))
    const allEvents = [];
    const allUids = [];
    
    console.log('startAt', dateKey, payload.dates[0], 'endtAt', payload.dates[1], `${payload.path}/`)
      
    fsQueryRef.get()
      .then(snapshot => {
        if (snapshot.empty) {
          console.log('No matching events.');
          return;
        }

        snapshot.forEach(event => {
          const eventData = event.data();
          const researcher = eventData.enteredBy;
          if (researcher && !includes(researcher, '@')) {
            if (!includes(allUids, researcher)) {
              dispatch(requestResearcherById(researcher))
            }
            allUids.push(researcher);
          }
          allEvents.push(eventData);
        });
      })
      .then(() => {
          dispatch(addAllOldEventsToState(allEvents));
          dispatch(setLoading(false));
          done();
      })
      .catch(err => {
        console.log(`Error fetching events: ${err}`);
      });
    }
});

const approveEventLogic = createLogic({
  type: APPROVE_EVENT,
  processOptions: {
    failType: APPROVE_EVENT_FAIL,
  },
  process(deps, dispatch, done) {
    const {
      action,
      firebasedb,
    } = deps;

    const {
      townHall,
      path,
      livePath,
    } = action.payload;
    const townHallMetaData = firebasedb.ref(`/townHallIds/${townHall.eventId}`);
    const cleanTownHall = {
      ...townHall,
      userEmail: null,
    }
    dispatch(setLoading(true));
    firebasedb.ref(`${livePath}/${townHall.eventId}`).update(cleanTownHall)
      .then(() => {
        const approvedTownHall = firebasedb.ref(`${path}/${cleanTownHall.eventId}`);
        approvedTownHall.remove()
          .then(() => {
            townHallMetaData.update({
              status: 'live',
            })
            .then(() => {
              dispatch(approveEventSuccess(cleanTownHall.eventId));
              dispatch(setLoading(false));
              done();
            })
          })
      })
  }
});

const archiveEventLogic = createLogic({
  type: ARCHIVE_EVENT,
  process(deps, dispatch, done) {
      const {
        action,
        firebasedb,
      } = deps;

      const {
        townHall,
        path,
        archivePath
      } = action.payload;
      const cleanTownHall = {
        ...townHall,
        userEmail: null,
      }
      const oldTownHall = firebasedb.ref(`${path}/${cleanTownHall.eventId}`);
      const oldTownHallID = firebasedb.ref(`/townHallIds/${cleanTownHall.eventId}`);
      const dateKey = cleanTownHall.dateObj ? moment(cleanTownHall.dateObj).format('YYYY-MM') : 'no_date';
      dispatch(setLoading(true));
      console.log(`${archivePath}/${dateKey}/${cleanTownHall.eventId}`)
      firebasedb.ref(`${archivePath}/${dateKey}/${cleanTownHall.eventId}`).update(cleanTownHall)
        .then(() => {
            const removed = oldTownHall.remove();
            if (removed) {
              oldTownHallID.update({
                status: 'archived',
                archive_path: `${archivePath}/${dateKey}`,
              })
              .then(() => {
                dispatch(archiveEventSuccess(cleanTownHall.eventId));
                dispatch(setLoading(false));
                done();
              })
            }
        })
        .catch(e => {
          console.log(e)
        })
      }
})

const deleteEvent = createLogic({
  type: DELETE_EVENT,
  processOptions: {
    failType: DELETE_EVENT_FAIL,
  },
  process(deps, dispatch, done) {
    const {
      action,
      firebasedb,
    } = deps;
    const { townHall, path } = action.payload;
    dispatch(setLoading(true));
    const oldTownHall = firebasedb.ref(`${path}/${townHall.eventId}`);
    if (path === 'townHalls') {
      firebasedb.ref(`/townHallIds/${townHall.eventId}`).update({
        eventId: townHall.eventId,
        lastUpdated: (Date.now()),
        status: 'cancelled',
      })
    }
    oldTownHall.remove()
      .then(() => {
        dispatch(deleteEventSuccess(townHall.eventId));
        dispatch(setLoading(false));
        done();
      });
  }
})

const updateEventLogic = createLogic({
  type: UPDATE_EXISTING_EVENT,
  processOptions: {
    successType: UPDATE_EVENT_SUCCESS,
    failType: UPDATE_EVENT_FAIL,
  },
  process(deps) {
    const {
      action,
      firebasedb,
    } = deps;
    console.log(action.payload);
    const { updateData, path, eventId } = action.payload;
    if(!path || !eventId) {
      return
    }
    return firebasedb.ref(`${path}/${eventId}`).update(updateData).then(() => {
      return {...updateData, eventId}
    })
  }
})

const updateOldEventLogic = createLogic({
  type: UPDATE_OLD_EVENT,
  processOptions: {
    successType: UPDATE_OLD_EVENT_SUCCESS,
    failType: UPDATE_EVENT_FAIL,
  },
  process(deps) {
    const {
      action,
      firestore,
    } = deps;
    const {
      updateData,
      eventId
    } = action.payload;
    if (!eventId) {
      console.log('Missing eventId');
      return
    }

    let eventRef = firestore.collection(ARCHIVE_COLLECTION).doc(eventId);
    return eventRef.update(updateData).then(() => {
      return {...updateData, eventId}
    })
    .catch(err => {
      console.log(`Error updating old event: ${err}`);
    });
  }
})

const requestEventsCounts = createLogic({
  type: REQUEST_EVENTS_COUNTS,
  processOptions: {
    failType: REQUEST_EVENTS_COUNTS_FAIL,
  },
  warnTimeout: 0,
  process(deps, dispatch, done) {
    const {
      action,
      firebasedb,
    } = deps;
    dispatch(clearEventsCounts());
    const path = action.payload;
    if (path === 'archive') {
      done();
    } else {
      firebasedb.ref(`${EVENTS_PATHS[path].STATE}`).on('value', (snapshot) => {
        const eventCounts = {};
        if (snapshot.numChildren() > 0) {
          for (let [key, val] of Object.entries(snapshot.val())) {
            eventCounts[key] = Object.keys(val).length;
          }
        }
        dispatch(requestStateEventsCountsSuccess(eventCounts));
      });
      firebasedb.ref(`${EVENTS_PATHS[path].FEDERAL}`).on('value', (snapshot) => {
        dispatch(requestFederalEventsCountsSuccess(snapshot.numChildren()));
      });
    }
  }
})

const requestTotalEventsCounts = createLogic({
  type: REQUEST_TOTAL_EVENTS_COUNTS,
  processOptions: {
    failType: REQUEST_EVENTS_COUNTS_FAIL,
  },
  warnTimeout: 0,
  process(deps, dispatch, done) {
    const { firebasedb } = deps;
    firebasedb.ref(`${EVENTS_PATHS[PENDING_EVENTS_TAB].STATE}`).on('value', (snapshot) => {
      let stateEventsCounts = 0;
      if (snapshot.numChildren() > 0) {
        snapshot.forEach((stateSnapshot) => {
          stateEventsCounts += stateSnapshot.numChildren();
        });
      }
      dispatch(requestStateTotalEventsCountsSuccess(stateEventsCounts));
    });
    firebasedb.ref(`${EVENTS_PATHS[PENDING_EVENTS_TAB].FEDERAL}`).on('value', (snapshot) => {
      dispatch(requestFederalTotalEventsCountsSuccess(snapshot.numChildren()));
    });
  }
});

const validateAndSaveOldEvent = createLogic({
  type: VALIDATE_AND_SAVE_OLD_EVENT,
  processOptions: {
    successType: VALIDATE_AND_SAVE_OLD_EVENT_SUCCESS,
    failType: GENERAL_FAIL,
  },
  process(deps) {
    const { payload } = deps.action;
    delete payload.editable;
    delete payload.error;
    delete payload.errorMessage;
    const url = process.env.NODE_ENV === 'production' ? ARCHIVE_MANAGER_URL : ARCHIVE_MANAGER_DEV_URL;
    return superagent
      .post(url + 'event')
      .send(payload)
      .then((res) => {
        if (res.status === 200) {
          return res.body;
        } 
        return Promise.reject();
      });
  },
});


export default [
  archiveEventLogic,
  approveEventLogic,
  fetchOldEventsLogic,
  fetchEvents,
  deleteEvent,
  updateEventLogic,
  updateOldEventLogic,
  requestEventsCounts,
  fetchFederalAndStateLiveEvents,
  requestTotalEventsCounts,
  validateAndSaveOldEvent,
];