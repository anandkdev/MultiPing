/// <reference types="chrome" />

console.log("OmniPulse Background Service Worker initialized.");

chrome.runtime.onInstalled.addListener(() => {
  console.log("OmniPulse Extension Installed Successfully.");
});