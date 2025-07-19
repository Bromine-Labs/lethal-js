//////////////////////////////
///          Init          ///
//////////////////////////////
import { BareMuxConnection } from "https://unpkg.com/@mercuryworkshop/bare-mux@2.1.7/dist/index.mjs";

//////////////////////////////
///         Options        ///
//////////////////////////////
const connection = new BareMuxConnection("/bareworker.js");

let wispURL;
let transportURL;
let proxyOption;

export let tabCounter = 0;
export let currentTab = 0;
export let framesElement;
export let currentFrame;
export const addressInput = document.getElementById("address");

await import("/assets/scram/scramjet.all.js");

const { ScramjetController } = window.$scramjetLoadController();

const scramjet = new ScramjetController({
	files: {
		wasm: "/scram/scramjet.wasm.wasm",
		all: "/scram/scramjet.all.js",
		sync: "/scram/scramjet.sync.js",
	},
	flags: {
		rewriterLogs: false,
		naiiveRewriter: false,
		scramitize: false,
	},
	siteFlags: {
		"https://www.google.com/(search|sorry).*": {
			naiiveRewriter: true,
		},
	},
});

scramjet.init();

const transportOptions = {
	epoxy: "https://unpkg.com/@mercuryworkshop/epoxy-transport@2.1.27/dist/index.mjs",
	libcurl: "https://unpkg.com/@mercuryworkshop/libcurl-transport@1.5.0/dist/index.mjs",
};

//////////////////////////////
///           SW           ///
//////////////////////////////
const stockSW = "./ultraworker.js";
const swAllowedHostnames = ["localhost", "127.0.0.1"];

/**
 * Registers the service worker if supported and allowed.
 * @returns {Promise<void>}
 * @throws Will throw if service workers are unsupported or not HTTPS on disallowed hosts.
 */
async function registerSW() {
	if (!navigator.serviceWorker) {
		if (
			location.protocol !== "https:" &&
			!swAllowedHostnames.includes(location.hostname)
		)
			throw new Error("Service workers cannot be registered without https.");

		throw new Error("Your browser doesn't support service workers.");
	}

	await navigator.serviceWorker.register(stockSW);
}

if (window.self === window.top) {
	await registerSW();
	console.log("lethal.js: Service Worker registered");
}

//////////////////////////////
///        Functions       ///
//////////////////////////////

/**
 * Creates a valid URL from input or returns a search URL.
 * @param {string} input - The input string or URL.
 * @param {string} [template="https://search.brave.com/search?q=%s"] - Search URL template.
 * @returns {string} Valid URL string.
 */
export function makeURL(input, template = "https://search.brave.com/search?q=%s") {
	try {
		return new URL(input).toString();
	} catch (err) {}

	const url = new URL(`http://${input}`);
	if (url.hostname.includes(".")) return url.toString();

	return template.replace("%s", encodeURIComponent(input));
}

/**
 * Updates BareMux connection with current transport and wisp URLs.
 * @returns {Promise<void>}
 */
async function updateBareMux() {
	if (transportURL != null && wispURL != null) {
		console.log(`lethal.js: Setting BareMux to ${transportURL} and Wisp to ${wispURL}`);
		await connection.setTransport(transportURL, [{ wisp: wispURL }]);
	}
}

/**
 * Sets the transport URL and updates BareMux.
 * @param {string} transport - Transport name or URL.
 * @returns {Promise<void>}
 */
export async function setTransport(transport) {
	console.log(`lethal.js: Setting transport to ${transport}`);
	transportURL = transportOptions[transport] || transport;
	await updateBareMux();
}

/**
 * Gets the current transport URL.
 * @returns {string | undefined}
 */
export function getTransport() {
	return transportURL;
}

/**
 * Sets the wisp URL and updates BareMux.
 * @param {string} wisp - Wisp URL.
 * @returns {Promise<void>}
 */
export async function setWisp(wisp) {
	console.log(`lethal.js: Setting Wisp to ${wisp}`);
	wispURL = wisp;
	await updateBareMux();
}

/**
 * Gets the current wisp URL.
 * @returns {string | undefined}
 */
export function getWisp() {
	return wispURL;
}

/**
 * Sets the proxy backend option and dynamically imports scripts if needed.
 * @param {string} proxy - Proxy backend name.
 * @returns {Promise<void>}
 */
export async function setProxy(proxy) {
	console.log(`lethal.js: Setting proxy backend to ${proxy}`);
	if (proxy === "uv") {
		await import("https://unpkg.com/@titaniumnetwork-dev/ultraviolet@3.2.10/dist/uv.bundle.js");
		await import("/assets/uv.config.js");
	}
	proxyOption = proxy;
}

/**
 * Gets the current proxy backend option.
 * @returns {string | undefined}
 */
export function getProxy() {
	return proxyOption;
}

/**
 * Gets the proxied URL based on the current proxy option.
 * @param {string} input - The input URL or hostname.
 * @returns {Promise<string>}
 */
export async function getProxied(input) {
	const url = makeURL(input);
	if (proxyOption === "scram") return scramjet.encodeUrl(url);
	return window.__uv$config.prefix + window.__uv$config.encodeUrl(url);
}

/**
 * Sets the container element for frames.
 * @param {HTMLElement} frames - The frames container element.
 */
export function setFrames(frames) {
	framesElement = frames;
}

/**
 * Class representing a browser tab with its own iframe.
 */
export class Tab {
	/**
	 * Creates a new tab with an iframe and appends it to frames container.
	 */
	constructor() {
		tabCounter++;
		this.tabNumber = tabCounter;

		this.frame = document.createElement("iframe");
		this.frame.setAttribute("class", "w-full h-full border-0 fixed");
		this.frame.setAttribute("title", "Proxy Frame");
		this.frame.setAttribute("src", "/newtab");
		this.frame.setAttribute("loading", "lazy");
		this.frame.setAttribute("id", `frame-${tabCounter}`);
		framesElement.appendChild(this.frame);

		this.switch();

		this.frame.addEventListener("load", () => this.handleLoad());

		document.dispatchEvent(
			new CustomEvent("new-tab", {
				detail: { tabNumber: tabCounter },
			}),
		);
	}

	/**
	 * Switches to this tab, hiding other iframes and updating the address input.
	 */
	switch() {
		currentTab = this.tabNumber;
		const frames = document.querySelectorAll("iframe");
		[...frames].forEach((frame) => frame.classList.add("hidden"));
		this.frame.classList.remove("hidden");

		currentFrame = document.getElementById(`frame-${this.tabNumber}`);

		addressInput.value = decodeURIComponent(
			this.frame?.contentWindow?.location.href.split("/").pop()
		);

		document.dispatchEvent(
			new CustomEvent("switch-tab", {
				detail: { tabNumber: this.tabNumber },
			}),
		);
	}

	/**
	 * Closes this tab by removing its iframe and dispatching a close event.
	 */
	close() {
		this.frame.remove();

		document.dispatchEvent(
			new CustomEvent("close-tab", {
				detail: { tabNumber: this.tabNumber },
			}),
		);
	}

	/**
	 * Handles iframe load event: updates history and address input.
	 */
	handleLoad() {
		let url = decodeURIComponent(
			this.frame?.contentWindow?.location.href.split("/").pop()
		);
		let title = this.frame?.contentWindow?.document.title;

		let history = localStorage.getItem("history")
			? JSON.parse(localStorage.getItem("history"))
			: [];
		history = [...history, { url, title }];
		localStorage.setItem("history", JSON.stringify(history));

		document.dispatchEvent(
			new CustomEvent("url-changed", {
				detail: { tabId: currentTab, title, url },
			}),
		);

		if (url === "newtab") url = "bromine://newtab";
		addressInput.value = url;
	}
}

/**
 * Creates a new tab.
 * @returns {Promise<void>}
 */
export async function newTab() {
	new Tab();
}

/**
 * Switches to the specified tab number.
 * @param {number} tabNumber - Tab number to switch to.
 */
export function switchTab(tabNumber) {
	const frames = document.querySelectorAll("iframe");
	[...frames].forEach((frame) => {
		frame.classList.toggle("hidden", frame.id !== `frame-${tabNumber}`);
	});

	currentTab = tabNumber;
	currentFrame = document.getElementById(`frame-${tabNumber}`);

	addressInput.value = decodeURIComponent(
		currentFrame?.contentWindow?.location.href.split("/").pop()
	);

	document.dispatchEvent(
		new CustomEvent("switch-tab", {
			detail: { tabNumber },
		}),
	);
}

/**
 * Closes the tab with the specified tab number.
 * @param {number} tabNumber - Tab number to close.
 */
export function closeTab(tabNumber) {
	const frames = document.querySelectorAll("iframe");
	[...frames].forEach((frame) => {
		if (frame.id === `frame-${tabNumber}`) {
			frame.remove();
		}
	});

	if (currentTab === tabNumber) {
		const otherFrames = document.querySelectorAll('iframe[id^="frame-"]');
		if (otherFrames.length > 0) {
			switchTab(parseInt(otherFrames[0].id.replace("frame-", "")));
		} else {
			newTab();
		}
	}

	document.dispatchEvent(
		new CustomEvent("close-tab", {
			detail: { tabNumber },
		}),
	);
}
