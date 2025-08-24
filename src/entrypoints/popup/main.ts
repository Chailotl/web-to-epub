document.querySelector<HTMLButtonElement>('#convert')!.addEventListener('click', () => {
	browser.tabs.query({
		active: true,
		currentWindow: true,
	}).then(tabs => browser.tabs.sendMessage(tabs[0].id!, 'convert'));
});