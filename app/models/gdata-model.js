/* Copyright 2009 and forward GlitchTech Science.  All rights reserved. */

/**
 * Simple library to interact with Google Documents (API 3.0)
 * Requires PrototypeJS to function (Class.create & Ajax.Request)
 */
var gdataModel = Class.create( commonModel, {

	initialize: function( $super ) {

		$super();

		this.GDATA_VARS = {
				ACCT_TYPE: "HOSTED_OR_GOOGLE",
				APP_NAME: "GlitchTechScience-CheckbookwebOS",
				VERS: "3.0"
			};
	},

	/**
	 * Performs AJAX call to get ClientAuth string for GDATA services
	 *
	 * @param	username	gmail address of account to authenticate with
	 * @param	password	password of username
	 * @param	service		service to authenticate with (ex 'writely' for creating documents or 'wise' for listing/reading them)
	 * @param	successFn	callback function for a successful fetch (can be null)
	 * @param	failureFn	callback function for an unsuccessful fetch (can be null)
	 * @param	timeDelay	time (in seconds) before system aborts request (can be null)
	 *
	 * @return	void		onsuccess
	 * @return	string		onfailure - returns the specific error message generated in gdata_general_failure
	 */
	gdata_authenticate: function( username, password, service, successFn, failureFn, timeDelay ) {

		var authString = "https://www.google.com/accounts/ClientLogin?Email=" + escape( username ) + "&Passwd=" + escape( password ) + "&accountType=" + this.GDATA_VARS['ACCT_TYPE'] + "&source=" + this.GDATA_VARS['APP_NAME'] + "&service=" + service;

		var authRequest = new Ajax.Request(
				authString,
				{
					method: 'get',
					evalJSON: 'false',
					timeout: timeDelay,
					onSuccess: this.gdata_authenticate_success.bind( this, successFn ),
					onFailure: this.gdata_general_failure.bind( this, failureFn )
				}
			);
	},

	/**
	 * PRIVATE: Parses authentication information to extract key
	 *
	 * @param	callbackFn	function to return to
	 * @param	response	requested information
	 *
	 * @return	void
	 */
	gdata_authenticate_success: function( callbackFn, response ) {

		this.gdata_authKey = "";

		var tempKeyArr = response.responseText.split( "\n" );

		for( var i = 0; i < tempKeyArr.length - 1; i++ ) {

			if( tempKeyArr[i].toLowerCase().indexOf( "auth=" ) !== -1 ) {

				this.gdata_authKey = "GoogleLogin auth=" + tempKeyArr[i].replace( /Auth=/i, "" );
				break;
			}
		}

		if( callbackFn && typeof( callbackFn ) === "function" ) {

			callbackFn();
		}
	},

	/**
	 * Performs AJAX call to get all spreadsheets in account
	 *
	 * @param	successFn	callback function for a successful fetch
	 * @param	failureFn	callback function for an unsuccessful fetch (can be null)
	 * @param	timeDelay	time (in seconds) before system aborts request (can be null)
	 *
	 * @return	void		onsuccess
	 * @return	string		onfailure - returns the specific error message generated in gdata_general_failure
	 */
	gdata_fetch_spreadsheet_list: function( successFn, failureFn, timeDelay ) {

		if( this.gdata_authKey.length <= 0 ) {

			failureFn( "No key found, please authenticate first." );
		}

		var sheetsRequest = new Ajax.Request(
				"https://spreadsheets.google.com/feeds/spreadsheets/private/full",
				{
					method: 'get',
					evalJSON: 'false',
					requestHeaders: {
						"GData-Version": this.GDATA_VARS['VERS'],
						"Authorization": this.gdata_authKey
					},
					timeout: timeDelay,
					onSuccess: this.gdata_fetch_spreadsheet_list_success.bind( this, successFn ),
					onFailure: this.gdata_general_failure.bind( this, failureFn )
				}
			);
	},

	/**
	 * PRIVATE: Parses authentication information to extract spreadsheets
	 *
	 * @param	callbackFn	function to return to
	 * @param	response	requested information
	 *
	 * @return	obj array	Array of all spreadsheet objects
	 */
	gdata_fetch_spreadsheet_list_success: function( callbackFn, response ) {

		var allSheetsObj = XMLObjectifier.xmlToJSON( response.responseXML ).entry;//Grab only the needed parts

		var sheetListObj = [];

		//Did the request return data
		if( !( typeof( allSheetsObj ) === "undefined" || allSheetsObj.length <= 0 ) ) {

			for( var i = 0; i < allSheetsObj.length; i++ ) {

				for( var j = 0; j < allSheetsObj[i].link.length; j++ ) {

					if( allSheetsObj[i].link[j].href.indexOf( "?key=" ) !== -1 ) {

						sheetListObj.push(
									{
										itemId: i,
										name: allSheetsObj[i].title[0].Text.replace( /\]\[/gi, "] [" ),
										sheetKey: allSheetsObj[i].link[j].href.split( "?key=" )[1],
										selectStatus: ''
									}
							);
					}
				}
			}
		}

		if( callbackFn && typeof( callbackFn ) === "function" ) {

			callbackFn( sheetListObj );
		}
	},

	/**
	 * Performs AJAX call to get general information about this spreadsheet
	 *
	 * @param	sheetKey	id of spreadsheet to query
	 * @param	successFn	callback function for a successful fetch
	 * @param	failureFn	callback function for an unsuccessful fetch (can be null)
	 * @param	timeDelay	time (in seconds) before system aborts request (can be null)
	 *
	 * @return	object		onsuccess
	 * @return	string		onfailure - returns the specific error message generated in gdata_general_failure
	 */
	gdata_fetch_spreadsheet_summary: function( sheetKey, successFn, failureFn, timeDelay ) {

		if( typeof( sheetKey ) === "undefined" ) {

			failureFn( "No sheet key defined." );
		}

		var sheetsRequest = new Ajax.Request(
				"https://spreadsheets.google.com/feeds/worksheets/" + sheetKey + "/private/full",
				{
					method: 'get',
					evalJSON: 'false',
					requestHeaders: {
						"GData-Version": this.GDATA_VARS['VERS'],
						"Authorization": this.gdata_authKey
					},
					timeout: timeDelay,
					onSuccess: successFn,//Integrate into model? line 502
					onFailure: this.gdata_general_failure.bind( this, failureFn )
				} );
	},

	/**
	 * Performs AJAX call to get specific information about this spreadsheet (List based feed)
	 *
	 * @param	sheetKey	id of spreadsheet to query
	 * @param	pageKey		id of page to query
	 * @param	startIndex	row index to start fetching
	 * @param	maxResults	max number of rows to fetch
	 * @param	successFn	callback function for a successful fetch
	 * @param	failureFn	callback function for an unsuccessful fetch (can be null)
	 * @param	timeDelay	time (in seconds) before system aborts request (can be null)
	 *
	 * @return	object		onsuccess
	 * @return	string		onfailure - returns the specific error message generated in gdata_general_failure
	 */
	gdata_fetch_spreadsheet_data: function( sheetKey, pageKey, startIndex, maxResults, successFn, failureFn, timeDelay ) {

		var sheetsRequest = new Ajax.Request(
				"https://spreadsheets.google.com/feeds/list/" + sheetKey + "/" + pageKey + "/private/full?start-index=" + startIndex + "&max-results=" + maxResults,
				{
					method: 'get',
					evalJSON: 'false',
					requestHeaders: {
						"GData-Version": this.GDATA_VARS['VERS'],
						"Authorization": this.gdata_authKey
					},
					timeout: timeDelay,
					onSuccess: successFn,//Integrate into model? line 502
					onFailure: this.gdata_general_failure.bind( this, failureFn )
				} );
	},

	/**
	 * Sends data to Google Docs as a single Spreadsheet
	 *
	 * @param	docTitle	Title of document to appear on Google Docs
	 * @param	docContent	Contents of the file. Each array row is a spreadsheet row. Each row should be in key: value format. (should be precleaned)
	 * @param	successFn	callback function for a successful fetch (can be null)
	 * @param	failureFn	callback function for an unsuccessful fetch (can be null)
	 * @param	timeDelay	time (in seconds) before system aborts request (can be null)
	 *
	 * @return	void		(callback fn) onsuccess
	 * @return	string		(callback fn) onfailure - returns the specific error message generated in gdata_general_failure
	 */
	gdata_upload_spreadsheet: function( docTitle, docContent, successFn, failureFn, timeDelay ) {

		//Convert key: value array

		var sheetsRequest = new Ajax.Request(
				"https://docs.google.com/feeds/upload/create-session/default/private/full?convert=false",
				{
					method: 'post',
					contentType: 'text/csv',
					'Content-Length': 0,
					postBody: '',
					requestHeaders: {
						'GData-Version': this.GDATA_VARS['VERS'],
						'Authorization': this.gdata_authKey,
						'Slug': docTitle,
						'X-Upload-Content-Type': 'text/csv',
						'X-Upload-Content-Length': 0//**TOTAL LENGTH OF DATA IN BYTES => ( string.length * 2 )
					},
					timeout: timeDelay,
					onSuccess: successFn,
					onFailure: this.gdata_general_failure.bind( this, failureFn )
				}
			);
	},

	gdata_upload_spreadsheet_2: function( docTitle, docContent, successFn, failureFn, timeDelay, response ) {

		Mojo.log.info( "REQUEST RETURNED" );
		Mojo.log.info( "|" + response + "|" );

		//https://code.google.com/apis/documents/docs/3.0/developers_guide_protocol.html#ResumableUpload
	},

	/**
	 * Sends string to Google Docs (CURRENTLY ONLY SPREADSHEET UPLOAD)
	 *
	 * @param	docTitle	Title of document to appear on Google Docs
	 * @param	docContent	Contents of the file (should be precleaned)
	 * @param	successFn	callback function for a successful fetch (can be null)
	 * @param	failureFn	callback function for an unsuccessful fetch (can be null)
	 * @param	timeDelay	time (in seconds) before system aborts request (can be null)
	 *
	 * @return	void		onsuccess
	 * @return	string		onfailure - returns the specific error message generated in gdata_general_failure
	 */
	gdata_upload_file: function( docTitle, docContent, successFn, failureFn, timeDelay ) {

		var atomFeed = "<?xml version='1.0' encoding='UTF-8'?>" +
						'<entry xmlns="http://www.w3.org/2005/Atom">' +
						'<category scheme="http://schemas.google.com/g/2005kind"' +
						' term="http://schemas.google.com/docs/2007spreadsheet"/>' +
						'<title>' + cleanString( docTitle ) + '</title>' +
						'</entry>';

		var postBody = '--END_OF_PART\r\n' +
						'Content-Type: application/atom+xml;\r\n\r\n' +
						atomFeed + '\r\n' +
						'--END_OF_PART\r\n' +
						'Content-Type: ' + 'text/csv' + '\r\n\r\n' +
						docContent + '\r\n' +
						'--END_OF_PART--\r\n';

		var sheetsRequest = new Ajax.Request(
				"https://docs.google.com/feeds/documents/private/full",
				{
					method: 'post',
					contentType: 'multipart/related; boundary=END_OF_PART',
					postBody: postBody,
					Slug: docTitle,
					"GData-Version": this.GDATA_VARS['VERS'],//Must be here to function, else ERR404
					requestHeaders: {
						"Authorization": this.gdata_authKey
					},
					timeout: timeDelay,
					onSuccess: successFn,
					onFailure: this.gdata_general_failure.bind( this, failureFn )
				}
			);
	},

	/**
	 * PRIVATE: Parses error informaiton, displays error message
	 *
	 * @param	callbackFn	function to return to
	 * @param	failure		object containing failure information
	 * @param	timeout		var to check if failure was due to timeout
	 *
	 * @return	string		returns error string via callbackFn
	 */
	gdata_general_failure: function( callbackFn, failure, timeout ) {

		var error_str = "";

		if( timeout && timeout === "timeout" ) {

			error_str = $L( "The request timed out. Please check your network connection and try again." );

		} else if( failure.responseText.match( "Error=BadAuthentication" ) ) {

			error_str = $L( "Did you enter your username and password correctly?" );

		} else if( failure.responseText.match( "Error=CaptchaRequired" ) ) {

			error_str = $L( "Google is requesting that you complete a CAPTCHA Challenge. Please go to <a href='https://www.google.com/accounts/DisplayUnlockCaptcha'>https://www.google.com/accounts/DisplayUnlockCaptcha</a> to complete it." );

		} else if( failure.responseText.match( "Error=NotVerified" ) ) {

			error_str = $L( "The account email address has not been verified. You will need to access your Google account directly to resolve the issue before logging in using a non-Google application." );

		} else if( failure.responseText.match( "Error=TermsNotAgreed" ) ) {

			error_str = $L( "You have not agreed to Google's terms. You will need to access your Google account directly to resolve the issue before logging in using a non-Google application." );

		} else if( failure.responseText.match( "Error=AccountDeleted" ) ) {

			error_str = $L( "The user account has been deleted and is therefore unable to log in." );

		} else if( failure.responseText.match( "Error=AccountDisabled" ) ) {

			error_str = $L( "The user account has been disabled. Please contact Google." );

		} else if( failure.responseText.match( "Error=ServiceDisabled" ) ) {

			error_str = $L( "Your access to the specified service has been disabled. (Your account may still be valid.)" );

		} else if( failure.responseText.match( "Error=ServiceUnavailable" ) ) {

			error_str = $L( "The service is not available; try again later." );

		} else if( failure.responseText.match( "Error=Unknown" ) ) {

			error_str = $L( "Unknown Error. Did you enter your username and password correctly?" );

		} else {

			error_str = $L( "There has been an error: " ) + failure.responseText;
			systemError( "There has been an error: " + failure.responseText + " [gdata ajax failure]" );
		}

		// Update system box
		this.showError();
		this.updateLoadingTitle( $L( "Error" ) );
		this.updateLoadingNote( error_str );

		this.hideLoadingSystemDelayed( 3 );

		if( callbackFn && typeof( callbackFn ) === "function" ) {

			callbackFn( error_str );
		}
	}
});