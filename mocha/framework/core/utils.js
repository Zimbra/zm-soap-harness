import config from '../../conf/config.js';
import { randomBytes } from 'node:crypto';

export function log(log) {
	if (config.showConsoleLog) {
		console.log(log);
	}
}

export function error(error) {
	if (config.showConsoleLog && !String(error.message).includes('already exists')) {
		console.error(`Error: ${error}`);
	}
}

export function sleep(miliSeconds) {
	const date = Date.now();
	let currentDate = null;
	do {
		currentDate = Date.now();
	} while (currentDate - date < miliSeconds);
}

export function sleepJs(ms) {
	return new Promise(resolve => setTimeout(resolve, ms));
}

export function getUniqueString() {
	return String(Date.now()).slice(-8) + randomBytes(2).toString('hex');
}

export function getClientMachineTodayDate() {
	let dd = new Date();
	let day = dd.getDate() < 10 ? '0' + dd.getDate() : dd.getDate();
	let mm = dd.getMonth() + 1 < 10 ? '0' + (dd.getMonth() + 1) : dd.getMonth() + 1;
	return String(dd.getFullYear()) + '-' + mm + '-' + day;
}

export function convertDateTime(date) {
		const currentDate = new Date(date);
		let dd = currentDate.getDate() < 10 ? '0' + currentDate.getDate() : currentDate.getDate();
		let mm = currentDate.getMonth() + 1 < 10 ? '0' + (currentDate.getMonth() + 1) : currentDate.getMonth() + 1;
		const yyyy = currentDate.getFullYear().toString();
		const hours = currentDate.getHours() < 10 ? '0' + currentDate.getHours() : currentDate.getHours();
		const minute = currentDate.getMinutes() < 10 ? '0' + currentDate.getMinutes() : currentDate.getMinutes();
		const convertedDate = yyyy + mm + dd + 'T' + hours + minute + '00';
	return convertedDate;
}

export function getDateyyyymmdd(day) {
		const todayDate = new Date(getClientMachineTodayDate());
		todayDate.setDate(todayDate.getDate() + Number(day));
		let dd = todayDate.getUTCDate();
		let mm = todayDate.getMonth() + 1; // January is 0!
		const yyyy = todayDate.getFullYear();
	if (dd < 10) {
		dd = '0' + dd;
	}

	if (mm < 10) {
		mm = '0' + mm;
	}
	return yyyy + '-' + mm + '-' + dd;
}

export async function getEmailUserName(contactEmail) {
	return contactEmail.substring(0, contactEmail.indexOf('@'));
}

export async function retryUntil(fn, condition, maxRetries = 5, delayMs = 3000, throwOnTimeout = false) {
	let result;
	for (let i = 0; i < maxRetries; i++) {
		try {
			result = await fn();
			if (condition(result)) return result;
		} catch (err) {
			console.error(`retryUntil: attempt ${i + 1} failed with error: ${err.message}`);
		}
		if (i < maxRetries - 1) await new Promise(res => setTimeout(res, delayMs));
	}
	if (throwOnTimeout) {
		throw new Error(`Condition not met after ${maxRetries} retries`);
	}
	return result;
}

// Default export for backward compatibility
export default {
	log,
	error,
	sleep,
	sleepJs,
	getUniqueString,
	getClientMachineTodayDate,
	convertDateTime,
	getDateyyyymmdd,
	getEmailUserName,
	retryUntil
};