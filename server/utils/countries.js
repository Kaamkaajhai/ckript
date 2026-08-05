import { COUNTRIES } from "./countriesList.js";

export { COUNTRIES };

/**
 * Is this a country we offer?
 *
 * Used to reject junk at the door rather than as a Mongoose `enum`: entry.save() runs
 * full-document validation in several places inside adminDeclareResults, so an enum would make
 * declaring results fail for any entry registered before this list existed.
 */
export const isKnownCountry = (value = "") => COUNTRIES.includes(String(value).trim());
