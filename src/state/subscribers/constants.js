import { makeConstant } from "../../utils";

const STATE_BRANCH = "SUBSCRIBERS";

export const REQUEST_FAILED = makeConstant(STATE_BRANCH, 'REQUEST_FAILED');
export const SUBMIT_SUBSCRIBER = makeConstant(STATE_BRANCH, 'SUBMIT_SUBSCRIBER');
export const SUBMIT_SUBSCRIBER_SUCCESS = makeConstant(STATE_BRANCH, 'SUBMIT_SUBSCRIBER_SUCCESS');
export const EDIT_SUBSCRIBER = makeConstant(STATE_BRANCH, 'EDIT_SUBSCRIBER');
export const EDIT_SUBSCRIBER_SUCCESS = makeConstant(STATE_BRANCH, 'EDIT_SUBSCRIBER_SUCCESS');
export const REQUEST_ALL_SUBSCRIBERS = makeConstant(STATE_BRANCH, 'REQUEST_ALL_SUBSCRIBERS');
export const REQUEST_ALL_SUBSCRIBERS_SUCCESS = makeConstant(STATE_BRANCH, 'REQUEST_ALL_SUBSCRIBERS_SUCCESS');
export const GET_EDIT_SUBSCRIBER = makeConstant(STATE_BRANCH, 'GET_EDIT_SUBSCRIBER');