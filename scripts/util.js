/******************************/
/** GTS Connection Functions **/
/******************************/
var syncQueue = [];

function gtsItemChanged( item, callbackFn ) {

	//Put item in syncQueue
	//If only item, send
		//if item has DELETE_ME as last_sync then need to delete
			//if this is an account then need to delete all contained transactions and orphan all linked transactions
		//else update
	//Else if no item is currently processing, send
	//Else wait
}

function gtsChangeComplete( itemId, itemI ) {

	//Verify item
	//Remove from list
	//use item callback
	//send next item (if exists)
}

/*******************************/
/** General Purpose Functions **/
/*******************************/
/** Determine function caller, only useful inside of function to be checked **/
/*
if( arguments.callee.caller == null ) {

	Mojo.Log.info( "The function was called from the top!" );
} else {

	Mojo.Log.info( "This function's caller was " + arguments.callee.caller );
}
*/

/** Properly format the amount for display **/
function formatAmount( amount ) {

	//see how Mojo.Format works with negative numbers

	var posCheck = ( ( ( Math.round( amount * 100 ) / 100 ) < 0 ) ? "-" : "" );

	if( Math.abs( amount ) >= 1000000000 ) {
		//over 1 billion

		amount = amount / 1000000000;

		return( posCheck + Mojo.Format.formatCurrency( Math.abs( amount ), 1 ) + "b" );
	} else if( Math.abs( amount ) >= 1000000 ) {
		//over 1 million

		amount = amount / 1000000;

		return( posCheck + Mojo.Format.formatCurrency( Math.abs( amount ), 1 ) + "m" );
	} else {

		return( posCheck + Mojo.Format.formatCurrency( Math.abs( amount ), 2 ) );
	}
}

/** Convert amount display version to number **/
function deformatAmount( amount ) {

	if( !amount ) {
		//If null or undefined

		return 0;
	}

	if( isNaN( amount ) ) {
		//If not a standard JS number

		//Check for (xxx.xx) style negative
		var negative = ( amount[0] === "(" && amount[amount.length - 1] === ")" );

		//Remove all letters and currency symbols
		amount = amount.replace( /[^0-9\s,'".-]*/g, "" ).trim();

		var decimal = amount.length;

		if( decimal <= 0 ) {

			return 0;
		}

		//Look for decimal character (only check for 1/100 style numbers)
		var i = 3;
		var len = amount.length - 1;
		while( i-- ) {

			if( amount[len - i] && amount[len - i] !== "-" && isNaN( amount[len - i] ) ) {

				decimal = len - i;
				break;
			}
		}

		var major = amount.slice( 0, decimal );
		var minor = amount.slice( decimal );

		amount = ( ( negative || major[0] == "-" ) ? "-" : "" ) + major.replace( /[^0-9]*/g, "" ) + "." + minor.replace( /[^0-9]*/g, "" );
	}

	return( parseFloat( amount ) );
}

/** Wrapper for Mojo.Format.formatDate for future conversion purposes **/
function formatDate( dateObj, dateTime ) {

	if( dateTime === 'special' ) {

		//YYYY-MM-DD hh:mm:ss
		return(
				padNumber( dateObj.getFullYear(), 4 ) + "-" +
				padNumber( dateObj.getMonth() + 1, 2 ) + "-" +
				padNumber( dateObj.getDate(), 2 ) + " " +
				padNumber( dateObj.getHours(), 2 ) + ":" +
				padNumber( dateObj.getMinutes(), 2 ) + ":" +
				padNumber( dateObj.getSeconds(), 2 )
			);
	} else {

		if( typeof( dateTime ) === "undefined" ) {

			dateTime = { date: 'medium', time: 'short' };
		} else if( typeof( dateTime['date'] ) === "undefined" ) {

			dateTime['date'] = 'medium';
		} else if( typeof( dateTime['time'] ) === "undefined" ) {

			dateTime['time'] = 'short';
		}

		return Mojo.Format.formatDate( dateObj, { date: dateTime['date'], time: dateTime['time'] } );
	}
}

/** Convert date display version to object **/
function deformatDate( inString ) {
		//Should parse the "special" format from above just fine

		var base = Date.parse( inString );

		if( isNaN( base ) ) {
			//Attempt to fix string by changing A.M. and P.M. to am and pm (case insensitive)

			base = Date.deformat( inString.replace( /A\.M\./i, "am" ).replace( /P\.M\./i, "pm" ) );
		}

		return( base );
}

/** Converts number to a string and adds leading zeroes until length is achieved **/
function padNumber( number, length ) {

	var str = '' + number;

	while( str.length < length ) {

		str = '0' + str;
	}

	return str;
}

/** Send email function **/
function sendEmail( titleText, bodyText ) {

	var stageController = null;

	try {

		stageController = Mojo.Controller.getAppController().getStageController( MainStageName );
	} catch( err ) {}

	if( stageController ) {

		var currentScene = stageController.activeScene();

		currentScene.serviceRequest(
				'palm://com.palm.applicationManager',
				{
					method: 'open',
					parameters: {
						id: 'com.palm.app.email',
						params: {
							summary: titleText,
							text: bodyText
						}
					}
				}
			);
	}
}

/** Strip HTML **/
function stripHTML( dirtyString ) {

	return( dirtyString.replace( /<\S[^><]*>/g, "" ) );
}

/** Cleans String **/
function cleanString( dirtyString ) {

	if( !dirtyString || dirtyString.length <= 0 ) {

		return "";
	}

	var dirtyItem = [ /&/g, /"/g, /</g, />/g, /`/g, /'/g, /\n/g ];
	var cleanItem = [ "&amp;", "&quot;", "$lt;", "&gt;", "'", "'", " " ];

	for( var i = 0; i < dirtyItem.length; i++ ) {

		dirtyString = dirtyString.replace( dirtyItem[i], cleanItem[i] );
	}

	return( dirtyString );
}

/** Dirty String **/
function dirtyString( cleanString ) {

	var cleanItem = [ /&amp;/g, /&quot;/g, /$lt;/g, /&gt;/g, /&rsquo;/g ];
	var dirtyItem = [ "&", '"', "<", ">", "'" ];

	for( var i = 0; i < dirtyItem.length; i++ ) {

		cleanString = cleanString.replace( cleanItem[i], dirtyItem[i] );
	}

	return( cleanString );
}

/** Format notes **/
function formatNotes( oldString ) {

	if( !oldString || typeof( oldString ) === "undefined" ) {

		oldString = "";
	}

	return( oldString.replace( /\n/g, "<br />" ) );
}

/** Return days in the month **/
function daysInMonth( inMonth, inYear ) {

	return( 32 - ( new Date( inYear, inMonth, 32 ) ).getDate() );
}

/** Error Submission System **/
function systemError( errorIn ) {

	Mojo.Log.info( "systemError" );

	if( typeof( errorIn ) === "string" && errorIn.toLowerCase().match( "read only database" ) ) {

		Mojo.Controller.errorDialog( $L( "Warning! Your database has become read only. Checkbook is unable to modify it in any way. Consult your operating system user's manual on how to remove the read only status from a file. For additional help, please <a href='mailto:glitchtechscience@gmail.com?subject=Checkbook - read only issue'>contact us</a>." ) );
	} else if( typeof( errorIn ) === "string" && errorIn.toLowerCase().match( "disk i/o error" ) ) {

		Mojo.Controller.errorDialog( $L( "Warning! Your database has become locked. Please restart Checkbook. This usually occurs if Checkbook is running while your device was put in USB mode. For additional help, please <a href='mailto:glitchtechscience@gmail.com?subject=Checkbook - disk i/o issue'>contact us</a>." ) );
	} else {

		var sceneName = "Unknown";

		var stageController = Mojo.Controller.getAppController().getStageController( MainStageName );

		if( stageController ) {

			var currentScene = stageController.activeScene();

			if( currentScene ) {

				sceneName = currentScene.sceneName;
			}
		}

		Mojo.Log.error( errorIn );

		if( checkbookPrefs['errorReporting'] === 1 ) {

			Mojo.Log.error( "Error sent to GlichTech Science's server." );

			var errorReport = new Ajax.Request(
					"http://glitchtechscience.com/webOS/feedbackform.php?feedbackType=*Checkbook Error*&location=" + sceneName + "&locale=" + Mojo.Locale.getCurrentLocale() + "&feedbackMessage=" + errorIn + "&feedbackEmail=ERROR_MESSAGE&cbFBindicator=cairo&feedbackNDUID=" + checkbookPrefs['nduid'] + "&feedbackappVersion=" + Mojo.Controller.appInfo.version,
					{
						method: 'post',
						evalJSON: 'false',
						onSuccess: function( response ) {}.bind( this ),
						onFailure: function() {}.bind( this )
					}
				);
		}
	}
}

/** Dump object data **/
function dump( obj ) {

	var out = '';

	for( var i in obj ) {

		if( typeof( obj[i] ) === "object" ) {

			out += dump( obj[i] );
		} else {

			out += i + ": " + obj[i] + "\n";
		}
	}

	return out;
}

/** Security **/
function resetSecurityDelay() {

	/*
	window.clearTimeout( checkSecurity );

	checkSecurity = function() {

			//lock app
		}.delay( USER_SET_DELAY );
	*/
}

/** Version Update **/
function checkAppUpdate( stageController ) {

	if( stageController ) {

		//checkbookPrefs['Metrix'].checkBulletinBoard( stageController.activeScene(), 1001 );
	}

	if( stageController && checkbookPrefs['updateCheck'] === "FIRST_RUN" ) {

		updateVersionData();

		var title = "<div class='center bold'>" + $L( "Welcome to Checkbook" ) + "</div>";
		var message =  "<div>" + $L( "Would you like to view the user guide?" ) + "</div>";

		var controller = stageController.activeScene();
		controller.showAlertDialog(
				{
					onChoose: function( value ) {

						if( value === "yes" ) {

							this.controller.serviceRequest(
									'palm://com.palm.applicationManager',
									{
										method: 'open',
										parameters: {
											target: 'http://glitchtechscience.com/webOS/checkbook/cbguide.php?inApp=true&ts=' + Date.parse( Date() )//add localization language to this page
										}
									}
								);
						}
					},
					title: title,
					message: message,
					allowHTMLMessage: true,
					choices:[
						{
							label: $L( 'Yes' ),
							value:'yes',
							type: 'blue'
						}, {
							label: $L( 'No' ),
							value:'no',
							type: 'negative'
						}
					]
				}
			);
	} else if( stageController && checkbookPrefs['updateCheck'] !== Mojo.Controller.appInfo.version ) {

		updateVersionData();

		if( checkbookPrefs['updateCheckNotification'] === 1 ) {

			var controller = stageController.activeScene();

			controller.showDialog(
					{
						template: 'dialogs/updateMessage-dialog',
						assistant: new updateMessageDialog( controller )
					}
				);
		}
	} else {

		return;
	}
}

function updateVersionData() {

	checkbookPrefs['updateCheck'] = Mojo.Controller.appInfo.version;

	accountsDB.transaction(
		(
			function( transaction ) {

				transaction.executeSql( "UPDATE prefs SET updateCheck = ?;", [ checkbookPrefs['updateCheck'] ] );
			}
		).bind( this ) );
}

/** Stored Data **/
var oriTransCat = [
			{
				genCat: "Auto & Transport",
				specCat: "Auto Insurance"
			}, {
				genCat: "Auto & Transport",
				specCat: "Auto Payment"
			}, {
				genCat: "Auto & Transport",
				specCat: "Gas & Fuel"
			}, {
				genCat: "Auto & Transport",
				specCat: "Parking"
			}, {
				genCat: "Auto & Transport",
				specCat: "Public Transportation"
			}, {
				genCat: "Auto & Transport",
				specCat: "Service & Parts"
			}, {
				genCat: "Auto & Transport",
				specCat: "Car Wash"
			}, {
				genCat: "Bills & Utilities",
				specCat: "Home Phone"
			}, {
				genCat: "Bills & Utilities",
				specCat: "Internet"
			}, {
				genCat: "Bills & Utilities",
				specCat: "Mobile Phone"
			}, {
				genCat: "Bills & Utilities",
				specCat: "Television"
			}, {
				genCat: "Bills & Utilities",
				specCat: "Utilities"
			}, {
				genCat: "Business Services",
				specCat: "Advertising"
			}, {
				genCat: "Business Services",
				specCat: "Legal"
			}, {
				genCat: "Business Services",
				specCat: "Office Supplies"
			}, {
				genCat: "Business Services",
				specCat: "Printing"
			}, {
				genCat: "Business Services",
				specCat: "Shipping"
			}, {
				genCat: "Education",
				specCat: "Books & Supplies"
			}, {
				genCat: "Education",
				specCat: "Student Loan"
			}, {
				genCat: "Education",
				specCat: "Tuition"
			}, {
				genCat: "Entertainment",
				specCat: "Amusement"
			}, {
				genCat: "Entertainment",
				specCat: "Arts"
			}, {
				genCat: "Entertainment",
				specCat: "Movies & DVDs"
			}, {
				genCat: "Entertainment",
				specCat: "Music"
			}, {
				genCat: "Entertainment",
				specCat: "Newspapers & Magazines"
			}, {
				genCat: "Fees & Charges",
				specCat: "ATM Fee"
			}, {
				genCat: "Fees & Charges",
				specCat: "Bank Fee"
			}, {
				genCat: "Fees & Charges",
				specCat: "Finance Charge"
			}, {
				genCat: "Fees & Charges",
				specCat: "Late Fee"
			}, {
				genCat: "Fees & Charges",
				specCat: "Service Fee"
			}, {
				genCat: "Financial",
				specCat: "Financial Advisor"
			}, {
				genCat: "Financial",
				specCat: "Life Insurance"
			}, {
				genCat: "Food & Dining",
				specCat: "Alcohol & Bars"
			}, {
				genCat: "Food & Dining",
				specCat: "Coffee Shops"
			}, {
				genCat: "Food & Dining",
				specCat: "Fast Food"
			}, {
				genCat: "Food & Dining",
				specCat: "Groceries"
			}, {
				genCat: "Food & Dining",
				specCat: "Restaurants"
			}, {
				genCat: "Gifts & Donations",
				specCat: "Charity"
			}, {
				genCat: "Gifts & Donations",
				specCat: "Gift"
			}, {
				genCat: "Health & Fitness",
				specCat: "Dentist"
			}, {
				genCat: "Health & Fitness",
				specCat: "Doctor"
			}, {
				genCat: "Health & Fitness",
				specCat: "Eyecare"
			}, {
				genCat: "Health & Fitness",
				specCat: "Gym"
			}, {
				genCat: "Health & Fitness",
				specCat: "Health Insurance"
			}, {
				genCat: "Health & Fitness",
				specCat: "Pharmacy"
			}, {
				genCat: "Health & Fitness",
				specCat: "Sports"
			}, {
				genCat: "Home",
				specCat: "Furnishings"
			}, {
				genCat: "Home",
				specCat: "Home Improvement"
			}, {
				genCat: "Home",
				specCat: "Home Insurance"
			}, {
				genCat: "Home",
				specCat: "Home Services"
			}, {
				genCat: "Home",
				specCat: "Home Supplies"
			}, {
				genCat: "Home",
				specCat: "Lawn & Garden"
			}, {
				genCat: "Home",
				specCat: "Mortgage & Rent"
			}, {
				genCat: "Income",
				specCat: "Bonus"
			}, {
				genCat: "Income",
				specCat: "Paycheck"
			}, {
				genCat: "Income",
				specCat: "Reimbursement"
			}, {
				genCat: "Income",
				specCat: "Rental Income"
			}, {
				genCat: "Income",
				specCat: "Returned Purchase"
			}, {
				genCat: "Kids",
				specCat: "Allowance"
			}, {
				genCat: "Kids",
				specCat: "Baby Supplies"
			}, {
				genCat: "Kids",
				specCat: "Babysitter & Daycare"
			}, {
				genCat: "Kids",
				specCat: "Child Support"
			}, {
				genCat: "Kids",
				specCat: "Kids Activities"
			}, {
				genCat: "Kids",
				specCat: "Toys"
			}, {
				genCat: "Personal Care",
				specCat: "Hair"
			}, {
				genCat: "Personal Care",
				specCat: "Laundry"
			}, {
				genCat: "Personal Care",
				specCat: "Spa & Massage"
			}, {
				genCat: "Pets",
				specCat: "Pet Food & Supplies"
			}, {
				genCat: "Pets",
				specCat: "Pet Grooming"
			}, {
				genCat: "Pets",
				specCat: "Veterinary"
			}, {
				genCat: "Shopping",
				specCat: "Books"
			}, {
				genCat: "Shopping",
				specCat: "Clothing"
			}, {
				genCat: "Shopping",
				specCat: "Electronics & Software"
			}, {
				genCat: "Shopping",
				specCat: "Hobbies"
			}, {
				genCat: "Shopping",
				specCat: "Sporting Goods"
			}, {
				genCat: "Taxes",
				specCat: "Federal Tax"
			}, {
				genCat: "Taxes",
				specCat: "Local Tax"
			}, {
				genCat: "Taxes",
				specCat: "Property Tax"
			}, {
				genCat: "Taxes",
				specCat: "Sales Tax"
			}, {
				genCat: "Taxes",
				specCat: "State Tax"
			}, {
				genCat: "Transfer",
				specCat: "Credit Card Payment"
			}, {
				genCat: "Travel",
				specCat: "Air Travel"
			}, {
				genCat: "Travel",
				specCat: "Hotel"
			}, {
				genCat: "Travel",
				specCat: "Rental Car & Taxi"
			}, {
				genCat: "Travel",
				specCat: "Vacation"
			}, {
				genCat: "Uncategorized",
				specCat: "Cash & ATM"
			}, {
				genCat: "Uncategorized",
				specCat: "Check"
			}, {
				genCat: "Uncategorized",
				specCat: "Other"
			}
		];