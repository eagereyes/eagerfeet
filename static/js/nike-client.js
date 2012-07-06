function onNikeOauthSuccess(results) {
	// Called when oauth flow returns a status of 'success'
	// This indicates that a new token was created and returned
	console.log('Success',results);
}
function onNikeOauthExisting(results) {
	// Called when oauth flow returns a status of 'existing'
	// This indicates that the user already has a token for the app
	console.log('Existing',results);
}
function onNikeOauthError(results) {
	// Called when oauth flow returns a status of 'error'
	// This indicates that an error occurred during the oauth flow
	// NOTE: Not currently implemented
	console.log('Error',results);
}
function onNikeOauthCancel(results) {
	// Called when oauth flow returns a status of 'cancel'
	// This indicates that the user clicked the cancel button
	console.log('Cancel',results);
}
