import {
  SUBMIT_SUBSCRIBER,
  EDIT_SUBSCRIBER,
  REQUEST_ALL_SUBSCRIBERS,
  GET_EDIT_SUBSCRIBER,
} from "./constants";

export const submitSubscriber = person => ({
  type: SUBMIT_SUBSCRIBER,
  payload: person
});

export const editSubscriber = person => ({
  type: EDIT_SUBSCRIBER,
  payload: person
});

export const requestAllSubscribers = () => ({
  type: REQUEST_ALL_SUBSCRIBERS,
});

export const requestEditSubscriber = (email) => ({
  type: GET_EDIT_SUBSCRIBER,
  payload: email
});