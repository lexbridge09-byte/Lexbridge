// API messages stay English for now. Where the status or field is known, show the localised wording instead.

export function localizeApiError(error, dictionary) {
  const states = dictionary.common.states;
  if (!error) return states.genericError;
  if (error.status === 0) return states.networkError;
  if (error.status === 401) return states.signInAgain;
  if (error.status === 403) return states.noAccess;
  if (error.status === 413) return states.tooLarge;
  if (error.status === 429) return states.tooManyRequests;
  if (error.status >= 500) return states.genericError;
  if (error.status === 400 && error.details?.length) return dictionary.forms.checkFields;
  return error.message || states.genericError;
}

export function localizeFieldErrors(error, dictionary) {
  const knownMessages = dictionary.forms.fieldErrors;
  return Object.fromEntries((error?.details ?? []).map((detail) => [detail.path, knownMessages[detail.path] ?? detail.message]));
}
