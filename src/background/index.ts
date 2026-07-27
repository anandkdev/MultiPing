/// <reference types="chrome" />

console.log("MultiPing Background Service Worker initialized.");

chrome.runtime.onInstalled.addListener(() => {
  console.log("MultiPing Extension Installed Successfully.");
});