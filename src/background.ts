let sidebarOpen = false;

// Listen for a click on the browser action icon.
browser.browserAction.onClicked.addListener(() => {
  // Toggle the sidebar's open state.
  if (sidebarOpen) {
    browser.sidebarAction.close();
  } else {
    browser.sidebarAction.open();
  }
  // Update the state variable.
  sidebarOpen = !sidebarOpen;
});
