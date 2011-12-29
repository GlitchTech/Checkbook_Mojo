/* Copyright 2009 and forward GlitchTech Science.  All rights reserved. */

var ImportDataAssistant = Class.create( gdataModel, {

	initialize: function( $super ) {

		$super();

		this.readInstructionsEvent = this.readInstructions.bindAsEventListener( this );
		this.submitUserDataEvent = this.submitUserData.bindAsEventListener( this );
		this.listTapHandlerEvent = this.listTapHandler.bindAsEventListener( this );

		this.timeOutCheck = null;
	},

	setup: function() {

		this.controller.setupWidget(
					"readInstructions",
					{},
					{
						buttonLabel: $L( "Continue" )
					}
				);

		this.controller.setupWidget(
					"username",
					{
						hintText: $L( "Username" ),
						limitResize: true,
						enterSubmits: false
					},
					this.usernameModel = { value : ( checkbookPrefs['saveGSheetsData'] === 1 ? checkbookPrefs['gSheetUser'] : "" ) }
				);

		this.controller.setupWidget(
					"password",
					{
						hintText: $L( "Password" ),
						limitResize: true,
						enterSubmits: false
					},
					this.passwordModel = { value : "" }
				);

		if( checkbookPrefs['saveGSheetsData'] === 1 ) {

			this.decryptGPass();
		}

		//Specific Balance Options
		this.controller.setupWidget(
				"saveLoginData",
				{//Attributes
					trueValue: 1,
					falseValue: 0
				},
				this.saveGSheetsData = {
					value: checkbookPrefs['saveGSheetsData']
				}
			);

		this.controller.setupWidget(
					"submitUserData",
					{},
					{
						buttonLabel: $L( "Log In" ),
						buttonClass: "affirmative"
					}
				);

		this.allSheetsList = [];

		this.dataAttr = {
			itemTemplate:'import-data/import-data-allSheetsTemplate',

			hasNoWidgets: true,
			swipeToDelete: false,
			reorderable: false
		};

		this.controller.setupWidget( 'spreadSheetList', this.dataAttr, { items:this.allSheetsList } );

		this.selectModeModel = {
				items: [
					{
						label: $L( "All" ),
						command: 'all'
					}, {
						label: $L( "None" ),
						command: 'none'
					}, {
						label: $L( "Inverted" ),
						command: 'invert'
					}
				]
			};
		this.controller.setupWidget( 'select-mode-sub-menu', null, this.selectModeModel );

		this.setupLoadingSystem();

		this.importCmdButtons = {
								visible: false,
								items: [
									{},
									{
										items: [
											{
												label: $L( 'Import Accounts' ),
												command:'acctChoose'
											}, {
												label: $L( 'Select...' ),
												submenu:'select-mode-sub-menu'
											}
										]
									},
									{}
								]
							};

		this.controller.setupWidget( Mojo.Menu.commandMenu, {}, this.importCmdButtons );

		var sceneMenuModel = {
							visible: true,
							items: [
								Mojo.Menu.editItem,
								appMenuPrefAccountsDisabled,
								appMenuFeaturesDisabled,
								cbAboutItem,
								cbHelpItem
							]
						};

		this.controller.setupWidget( Mojo.Menu.appMenu, appMenuOptions, sceneMenuModel );
	},

	ready: function() {

		this.controller.get( 'import-system-header' ).update( $L( "Import Data" ) );
		this.controller.get( 'instruction-container-text' ).update( $L( "To import your finances into this program you must have a Google Documents account. (<a href='http://docs.google.com/'>Click here</a> to sign up.)<br /><br />Upload or create a spreadsheet with all the information to import. <span style='color:#ff0000;'>The first row of the spreadsheet must have the following columns: account, accountCat, date, amount, description, cleared, note.</span> Once that is complete, tap &quot;Continue&quot;, select your spreadsheet, then the system will import your data." ) );
		this.controller.get( 'login-container-title' ).update( $L( "Google Account" ) );
		this.controller.get( 'login-container-info-text' ).update( $L( "Enter your Google Spreadsheets information to import your financial data from <a href='http://docs.google.com/'>Google Documents</a> to your device." ) );
		this.controller.get( 'save-login-data-label' ).update( $L( "Save Login Information" ) );
		this.controller.get( 'spreadsheet-list-title' ).update( $L( "Discovered Spreadsheets" ) );

		this.fetchAccountNames();
	},

	//500ms before activate
	aboutToActivate: function() {

		this.hideLoadingSystemNow();

		Element.show( this.controller.get( 'instructionContainer' ) );
		Element.hide( this.controller.get( 'loginContainer' ) );
		Element.hide( this.controller.get( 'spreadSheetListContainer' ) );

		this.importCmdButtons['visible'] = false;
		this.controller.modelChanged( this.importCmdButtons );
	},

	activate: function() {

		Mojo.Event.listen( this.controller.get( 'readInstructions' ), Mojo.Event.tap, this.readInstructionsEvent );
		Mojo.Event.listen( this.controller.get( 'submitUserData' ), Mojo.Event.tap, this.submitUserDataEvent );
		Mojo.Event.listen( this.controller.get( 'spreadSheetList' ), Mojo.Event.listTap, this.listTapHandlerEvent );
	},

	readInstructions: function() {

		this.hideLoadingSystemNow();
		this.showLoginContainer();
	},

	showLoginContainer: function() {

		Element.hide( this.controller.get( 'instructionContainer' ) );
		Element.show( this.controller.get( 'loginContainer' ) );
		Element.hide( this.controller.get( 'spreadSheetListContainer' ) );

		this.importCmdButtons['visible'] = false;
		this.controller.modelChanged( this.importCmdButtons );
	},

	decryptGPass: function() {

		//fetch spike
		accountsDB.transaction(
			(
				function( transaction ) {

					transaction.executeSql( "SELECT spike FROM prefs LIMIT 1;", [], this.decryptGPassHandler.bind( this ), this.sqlError.bind( this, "decrypt gpass" ) );
				}
			).bind( this ) );
	},

	decryptGPassHandler: function( transaction, results ) {

		var row = results.rows.item( 0 );
		this.passwordModel['value'] = Mojo.Model.decrypt( row['spike'], checkbookPrefs['gSheetPass'] );

		this.controller.modelChanged( this.passwordModel );
	},

	submitUserData: function() {

		//fetch spike
		accountsDB.transaction((function(transaction) {

			transaction.executeSql("SELECT spike FROM prefs LIMIT 1;", [], this.encryptGPassHandler.bind(this), this.sqlError.bind(this, "decrypt gpass"));
		}).bind(this));
	},

	encryptGPassHandler: function( transaction, results ) {

		var row = results.rows.item( 0 );

		checkbookPrefs['saveGSheetsData'] = this.saveGSheetsData.value;
		checkbookPrefs['gSheetUser'] = ( checkbookPrefs['saveGSheetsData'] === 1 ? this.usernameModel.value : "" );
		checkbookPrefs['gSheetPass'] = ( checkbookPrefs['saveGSheetsData'] === 1 ? Mojo.Model.encrypt( row['spike'], this.passwordModel.value ) : "" );

		accountsDB.transaction(
			(
				function( transaction ) {

					transaction.executeSql( "UPDATE prefs SET saveGSheetsData = ?, gSheetUser = ?, gSheetPass = ?;", [ checkbookPrefs['saveGSheetsData'], checkbookPrefs['gSheetUser'], checkbookPrefs['gSheetPass'] ] );
				}
			).bind( this ) );

		this.authenticateWithGoogle( this.usernameModel.value, this.passwordModel.value );
	},

	fetchAccountNames: function() {

		var accountQry = "SELECT * FROM accounts;";

		accountsDB.transaction(
			(
				function( transaction ) {

					transaction.executeSql( accountQry, [], this.processAccountData.bind( this ), this.sqlErrorHandler.bind( this, accountQry ) );
				}
			).bind( this ) );

		var accountCatQry = "SELECT name FROM accountCategories WHERE name = 'Imported Account';";

		accountsDB.transaction(
			(
				function( transaction ) {

					transaction.executeSql( accountCatQry, [], this.processAccountCatQry.bind( this ), this.sqlErrorHandler.bind( this, accountCatQry ) );
				}
			).bind( this ) );
	},

	processAccountData: function( transaction, results ) {

		//Handle the results
		try {

			this.accountList = {};

			for( var i = 0; i < results.rows.length; i++ ) {

				var row = results.rows.item( i );

				this.addAccountListItem( row['acctCategory'], row['acctName'], row['acctId'] );
			}
		} catch( err ) {

			var errorBlock = this.controller.get( 'login-container-error' );
			Element.update( errorBlock, $L( "Error: " ) + err );
			Element.show( errorBlock );

			systemError( "Import process account data: " + err + "[Building account list]" );
		}
	},

	addAccountListItem: function( acctCategory, acctName, acctId ) {

		if( typeof( this.accountList[acctCategory] ) === "undefined" ) {

			this.accountList[acctCategory] = {};
		}

		this.accountList[acctCategory][acctName] = acctId;
	},

	processAccountCatQry: function( transaction, results ) {

		//Handle the results
		try {

			this.importCatFound = false;

			for( var i = 0; i < results.rows.length; i++ ) {

				var row = results.rows.item( i );

				if( row['name'] === "Imported Account" ) {

					this.importCatFound = true;
				}
			}
		} catch( err ) {

			var errorBlock = this.controller.get( 'login-container-error' );
			Element.update( errorBlock, $L( "Error: " ) + err );
			Element.show( errorBlock );

			systemError( "Import process Cat Error: " + err + "[Checking for Imported Account category]" );
		}
	},

	/** Authenticate **/
	authenticateWithGoogle: function( user, pass ) {

		this.hideError();
		this.updateLoadingSystem( true, $L( "Retrieving Key" ), "", 0 );

		this.gdata_authenticate( user, pass, "wise", this.fetchAllSheets.bind( this ), this.ajaxFailure.bind( this ), 10 );
	},

	fetchAllSheets: function( response ) {

		this.updateLoadingSystem( true, $L( "Retrieving spreadsheets..." ), "", 0 );

		this.gdata_fetch_spreadsheet_list( this.displaySheets.bind( this ), this.ajaxFailure.bind( this ), 20 );
	},

	displaySheets: function( sheetListObj ) {

		this.allSheetsList = sheetListObj;

		//Did the request get the right data
		if( this.allSheetsList.length <= 0 ) {

			this.endImportSystem( $L( "No data available to be imported." ), false );
		} else {

			//Fix item numbers
			for( var i = 0; i < this.allSheetsList.length; i++ ) {

				this.allSheetsList[i]['itemId'] = i;
			}

			this.controller.setWidgetModel( 'spreadSheetList', { items:this.allSheetsList } );

			Element.show( this.controller.get( 'spreadSheetListContainer' ) );

			this.hideLoadingSystem();

			Element.hide( this.controller.get( 'instructionContainer' ) );
			Element.hide( this.controller.get( 'loginContainer' ) );
			Element.show( this.controller.get( 'spreadSheetListContainer' ) );

			this.importCmdButtons['visible'] = true;
			this.controller.modelChanged( this.importCmdButtons );
		}
	},

	listTapHandler: function( event ) {

		var refId = event.item['itemId'];

		if( event.item['selectStatus'] != '' ) {

			this.allSheetsList[refId]['selectStatus'] = '';
		} else {

			this.allSheetsList[refId]['selectStatus'] = 'true';
		}

		this.controller.get( 'spreadSheetList' ).mojo.noticeUpdatedItems( refId, this.allSheetsList.slice( refId, refId + 1 ) );
	},

	handleCommand: function( event ) {

		if( event.type === Mojo.Event.command ) {

			switch( event.command ) {

				case 'acctChoose':
					event.stop();
					this.processAccountsSelected();
					break;

				case 'all':
					for( var i = 0; i < this.allSheetsList.length; i++ ) {

						this.allSheetsList[i]['selectStatus'] = 'true';
					}

					this.controller.get( 'spreadSheetList' ).mojo.noticeUpdatedItems( 0, this.allSheetsList );
					event.stop();
					break;
				case 'none':
					for( var i = 0; i < this.allSheetsList.length; i++ ) {

						this.allSheetsList[i]['selectStatus'] = '';
					}

					this.controller.get( 'spreadSheetList' ).mojo.noticeUpdatedItems( 0, this.allSheetsList );
					event.stop();
					break;
				case 'invert':
					for( var i = 0; i < this.allSheetsList.length; i++ ) {

						if( this.allSheetsList[i]['selectStatus'] != '' ) {

							this.allSheetsList[i]['selectStatus'] = '';
						} else {

							this.allSheetsList[i]['selectStatus'] = 'true';
						}
					}

					this.controller.get( 'spreadSheetList' ).mojo.noticeUpdatedItems( 0, this.allSheetsList );
					event.stop();
					break;
			}
		}
	},

	processAccountsSelected: function() {

		try {

			this.controller.stageController.setWindowProperties( { "blockScreenTimeout": true, "setSubtleLightbar": true } );
			//systemError( "Window Props (Import Start): Timeout & Dimming" );
		} catch( err ) {

			systemError( "Window Props (Import Start): " + err );
		}

		this.importItems = new Array();

		for (var i = 0; i < this.allSheetsList.length; i++) {

			if( this.allSheetsList[i]['selectStatus'] != '' ) {

				this.importItems.push( this.allSheetsList[i]['sheetKey'] );
			}
		}

		this.updateLoadingSystem( true, $L( "Fetching sheet pages..." ), "", 0 );

		Element.hide( this.controller.get( 'instructionContainer' ) );
		Element.hide( this.controller.get( 'loginContainer' ) );
		Element.hide( this.controller.get( 'spreadSheetListContainer' ) );

		this.importCmdButtons['visible'] = false;
		this.controller.modelChanged( this.importCmdButtons );

		//Is anything checked?
		if( this.importItems.length <= 0 ) {

			this.endImportSystem( $L( "Imported 0 transactions..." ), true );
		} else {

			this.importedData = [];

			this.importItemIndex = 0;

			this.importErrorCount = 0;

			this.updateProgressBar( 0 );

			this.fetchSheetSections();
		}
	},

	fetchSheetSections: function() {

		try {

			this.sheetKey = this.importItems[this.importItemIndex];

			//Close and hide list object
			this.allSheetsList.clear();
			this.controller.setWidgetModel( 'spreadSheetList', { items:this.allSheetsList } );
			Element.hide( this.controller.get( 'spreadSheetList' ) );

			this.gdata_fetch_spreadsheet_summary( this.sheetKey, this.fetchSheetData.bind( this ), this.ajaxFailure.bind( this ), 20 );
		} catch( err ) {

			systemError( "Error in Import >> fetchSheetSections:" + err );
		}
	},

	fetchSheetData: function( response ) {

		try {

			if( ( !XMLObjectifier.xmlToJSON( response.responseXML ).entry || typeof( XMLObjectifier.xmlToJSON( response.responseXML ).entry ) === "undefined" ) && this.importErrorCount < 3 ){

				this.updateLoadingNote( $L( "Attempting to fix bad import data." ) );

				this.importErrorCount++;

				//Restart this again
				this.fetchSheetSections();
			} else {

				if( this.importErrorCount >= 3 ) {

					var errorBlock = this.controller.get( 'login-container-error' );
					Element.update( errorBlock, $L( "There has been an error: " ) + " Multiple sets of bad data from Google. Please try again later." );
					Element.show( errorBlock );

					systemError( "Import Error! 3 failures: null object [import ajax failure]" );

					this.importErrorCount = 0;

					this.readInstructions();
				} else {

					var singleSheetObj = XMLObjectifier.xmlToJSON( response.responseXML ).entry;

					this.pageId = new Array();
					this.currPageIdIndex = 0;

					for( var i = 0; i < singleSheetObj.length; i++ ) {

						for( var j = 0; j < singleSheetObj[i].link.length; j++ ) {

							if( singleSheetObj[i].link[j].href.indexOf( "?key=" + this.sheetKey + "&sheet=" ) !== -1 ) {

								//Add page to array with all sheet Ids
								this.pageId.push( [ singleSheetObj[i].link[j].href.split( "&sheet=" )[1], singleSheetObj[i].title[0].Text ] );
							}
						}
					}

					var statusString = $L( "Transactions: " ) + "0%" + "<br />" +
										$L( "Page: " ) + ( this.currPageIdIndex + 1 ) + $L( " of " ) + this.pageId.length + "<br />" +
										$L( "Spreadsheet: " ) + ( this.importItemIndex + 1 ) + $L( " of " ) + this.importItems.length;

					this.updateLoadingTitle( $L( "Retrieving Data" ) );
					this.updateLoadingNote( statusString );

					this.gdata_fetch_spreadsheet_data( this.sheetKey, this.pageId[this.currPageIdIndex][0], 1, 100, this.checkData.bind( this ), this.ajaxFailure.bind( this ), 30 );
				}
			}
		} catch( err ) {

			systemError( "Error in Import >> fetchSheetData:" + err );
		}
	},

	checkData: function( response ) {

		try {

			var entireDataObj = XMLObjectifier.xmlToJSON( response.responseXML );

			if( ( !entireDataObj.entry || typeof( entireDataObj.entry ) === "undefined" ) && this.importErrorCount < 3 ) {

				this.updateLoadingNote( $L( "Attempting to fix bad import data." ) );

				this.importErrorCount++;

				//Restart call
				this.gdata_fetch_spreadsheet_data( this.sheetKey, this.pageId[this.currPageIdIndex][0], ( this.currStartIndex + this.itemsPerPage ), 100, this.checkData.bind( this ), this.ajaxFailure.bind( this ), 30 );
			} else if( this.importErrorCount >= 3 ) {

				var errorBlock = this.controller.get( 'login-container-error' );
				Element.update( errorBlock, $L( "There has been an error: " ) + "Multiple sets of bad data from Google. Please try again." );
				Element.show( errorBlock );

				systemError( "Import Error! 3 failures: null object [import ajax failure]" );

				this.importErrorCount = 0;

				this.readInstructions();
			} else {

				this.importErrorCount = 0;

				//Always present fields
				this.totalResults = parseInt( entireDataObj.totalResults[0].Text );
				this.itemsPerPage = parseInt( entireDataObj.itemsPerPage[0].Text );
				this.currStartIndex = parseInt( entireDataObj.startIndex[0].Text );

				dataObj = entireDataObj.entry;

				if( this.currStartIndex == 1 &&
					(
						typeof( dataObj[0].amount ) === "undefined" ||
						typeof( dataObj[0].amount[0].Text ) === "undefined" ||
						typeof( dataObj[0].description ) === "undefined" ||
						typeof( dataObj[0].description[0].Text ) === "undefined" ||
						typeof( dataObj[0].date ) === "undefined" ||
						typeof( dataObj[0].date[0].Text ) === "undefined"
					) ) {

					var title = $L( "Warning! Missing Fields" );
					var message = $L( "The current item is missing one or more of the essential fields to properly import the data. These fields can be blank, but doing so may result in an improper import. The first row should have the following items: account, accountCat, date, amount, description, cleared, note." ) + "(" + this.pageId[this.currPageIdIndex][1] + ")";

					this.controller.showAlertDialog(
							{
								onChoose: function( value ) {

									switch( value ) {
										case "skip":
											this.currStartIndex = this.totalResults;
											//this.currPageIdIndex < this.pageId.length
											this.processDataNext();
											break;
										case "abort":
											Mojo.Controller.getAppController().showBanner( $L( "Imported aborted..." ), "", "cbNotification" );
											this.controller.stageController.popScene();
											break;
										default:
											this.processData( dataObj );
											break;
									}
								},
								title: title,
								message: message,
								preventCancel: true,
								choices:[
									{
										label: $L( "Ignore and Continue" ),
										value: "ignore",
										type: "blue"
									}, {
										label: $L( "Skip Current Item" ),
										value: "skip",
										type: "negative"
									}, {
										label: $L( "Abort Import Process" ),
										value: "abort",
										type: "negative"
									}
								]
							}
						);
				} else {

					this.processData( dataObj );
				}
			}
		} catch( err ) {

			systemError( "Error in Import >> checkData:" + err );
		}
	},

	processData: function( dataObj ) {

		try {

			var fetchError = false;

			if( typeof( dataObj ) !== "undefined" ) {

				try {

					for( var i = 0; i < dataObj.length; i++ ) {

						var gtId, account, accountCat, date, desc, amount, cleared, checkNum, note, category, linkedRecord, linkedAccount, linkedAccountCat;

						//Field Names
						if( typeof( dataObj[i].amount ) !== "undefined" && typeof( dataObj[i].amount[0].Text ) !== "undefined" ) {

							amount = deformatAmount( dataObj[i].amount[0].Text );
						} else {

							amount = "";
						}

						if( amount !== "" && !isNaN( amount ) ) {

							if( typeof( dataObj[i].description ) === "undefined" || typeof( dataObj[i].description[0].Text ) === "undefined" || dataObj[i].description[0].Text === "" ) {

								desc = "N/A";
							} else {

								desc = stripHTML( dataObj[i].description[0].Text );
							}

							if( typeof( dataObj[i].cleared ) === "undefined" || typeof( dataObj[i].cleared[0].Text ) === "undefined" ) {

								cleared = 1;
							} else if( dataObj[i].cleared[0].Text == 0 ||
										dataObj[i].cleared[0].Text.toLowerCase() == "no" ||//convert to lower case
										dataObj[i].cleared[0].Text.toLowerCase() == "not" ||
										dataObj[i].cleared[0].Text.toLowerCase() == "false" ||
										dataObj[i].cleared[0].Text == "" ) {

								cleared = 0;
							} else {

								cleared = 1;
							}

							if( typeof( dataObj[i].checknum ) === "undefined" || typeof( dataObj[i].checknum[0].Text ) === "undefined" || dataObj[i].checknum[0].Text === "" ) {

								checkNum = "";
							} else {

								checkNum = stripHTML( dataObj[i].checknum[0].Text );
							}

							if( typeof( dataObj[i].note ) === "undefined" || typeof( dataObj[i].note[0].Text ) === "undefined" || dataObj[i].note[0].Text === "" ) {

								note = "";
							} else {

								note = stripHTML( dataObj[i].note[0].Text );
							}

							if( typeof( dataObj[i].date ) === "undefined" || typeof( dataObj[i].date[0].Text ) === "undefined" || dataObj[i].date[0].Text === "" ) {

								date = Date.parse( new Date() );
							} else {

								date = deformatDate( dataObj[i].date[0].Text );
							}

							if( isNaN( date ) ) {

								date = Date.parse( new Date() );
							}

							if( typeof( dataObj[i].gtid ) === "undefined" || typeof( dataObj[i].gtid[0].Text ) === "undefined" ) {

								gtId = "";
							} else {

								gtId = dataObj[i].gtid[0].Text;
							}

							if( typeof( dataObj[i].gtcat ) === "undefined" || typeof( dataObj[i].gtcat[0].Text ) === "undefined" ) {
								//No or bad category data

								category = [
										{
											'category': '',
											'category2': '',
											'amount': ''
										}
									];
							} else {
								//Adapt for split transactions
									//Check for state of string (ie &amp; instead of &)
									//Deformat amounts

								if( dataObj[i].gtcat[0].Text.isJSON() ) {
									//valid JSON

									category = dataObj[i].gtcat[0].Text.evalJSON();
								} else {
									//Assuming old style import

									category = [
											{
												'category': dataObj[i].gtcat[0].Text.split( "|", 2 )[0],
												'category2': dataObj[i].gtcat[0].Text.split( "|", 2 )[1],
												'amount': ''
											}
										];
								}
							}

							if( typeof( dataObj[i].gtlinkid ) === "undefined" || typeof( dataObj[i].gtlinkid[0].Text ) === "undefined" ) {

								linkedRecord = "";
							} else {

								linkedRecord = dataObj[i].gtlinkid[0].Text;
							}

							//Account data
							if( typeof( dataObj[i].account ) === "undefined" || typeof( dataObj[i].account[0].Text ) === "undefined" ) {

								account = "";
							} else {

								account = dataObj[i].account[0].Text;
							}

							if( typeof( dataObj[i].accountcat ) === "undefined" || typeof( dataObj[i].accountcat[0].Text ) === "undefined" ) {

								accountCat = "";
							} else {

								accountCat = dataObj[i].accountcat[0].Text;
							}

							if( accountCat === "" && account === "" && this.pageId[this.currPageIdIndex][1].toLowerCase().indexOf( "[checkbook]" ) !== -1 ) {

								var nameCat = this.pageId[this.currPageIdIndex][1].replace( /\[Checkbook\]/i, "" );//Remove identifier
								var nameCat = nameCat.replace( /\[[0-9]{2}\/[0-9]{2}\/[0-9]{4}\]/i, "" );//Remove date

								account = nameCat.replace( / \[(.*)$/i, "" );
								accountCat = nameCat.replace( /.* [(.*)]$/i, "$1" );
							}

							if( accountCat === "" ) {

								accountCat = $L( "Imported Account" );
							}

							if( account === "" ) {

								account = this.pageId[this.currPageIdIndex][1];
							}

							//If account does not exist, create it
							if( typeof( this.accountList[accountCat] ) === "undefined" || typeof( this.accountList[accountCat][account] ) === "undefined" ) {

								this.addAccountListItem( accountCat, account, -1 );
								this.insertNewAccount( account, accountCat );
							}

							//Linked account data
							if( typeof( dataObj[i].gtlinkedaccount ) === "undefined" || typeof( dataObj[i].gtlinkedaccount[0].Text ) === "undefined" ) {

								linkedAccount = "";
							} else {

								linkedAccount = dataObj[i].gtlinkedaccount[0].Text;
							}

							if( typeof( dataObj[i].gtlinkedaccountcat ) === "undefined" || typeof( dataObj[i].gtlinkedaccountcat[0].Text ) === "undefined" ) {

								linkedAccountCat = $L( "Imported Account" );
							} else {

								linkedAccountCat = dataObj[i].gtlinkedaccountcat[0].Text;
							}

							//If linked account does not exist, create it
							if( typeof( this.accountList[linkedAccountCat] ) === "undefined" || typeof( this.accountList[linkedAccountCat][linkedAccount] ) === "undefined" ) {

								this.addAccountListItem( linkedAccountCat, linkedAccount, -1 );
								this.insertNewAccount( linkedAccount, linkedAccountCat );
							}

							this.importedData.push(
										{
											'gtId': gtId,

											'account': account,
											'accountCat': accountCat,

											'date': date,
											'desc': desc,
											'amount': amount,

											'cleared': cleared,

											'checkNum': checkNum,
											'note': note,
											'category': category,

											'linkedRecord': linkedRecord,
											'linkedAccount': linkedAccount,
											'linkedAccountCat': linkedAccountCat
										}
									);
						}
					}

					var percentCompleted = ( ( ( this.currStartIndex + i ) / this.totalResults ) * 100 );
					percentCompleted = ( percentCompleted > 100 ? 100 : percentCompleted );

					var statusString = $L( "Transactions: " ) + percentCompleted.toFixed( 1 ) + "%<br />" +
										$L( "Page: " ) + ( this.currPageIdIndex + 1 ) + $L( " of " ) + this.pageId.length + "<br />" +
										$L( "Spreadsheet: " ) + ( this.importItemIndex + 1 ) + $L( " of " ) + this.importItems.length;

					this.updateLoadingNote( statusString );
					this.updateProgressBar( ( ( ( this.currPageIdIndex + ( ( this.currStartIndex + i ) / this.totalResults ) * 1 ) / this.pageId.length * 1 ) + this.importItemIndex ) / this.importItems.length );
				} catch( err ) {

					if( !err.match( "Cannot call method 'get' of undefined" ) ) {

						var errorBlock = this.controller.get( 'login-container-error' );
						Element.update( errorBlock, "Error: " + err );
						Element.show( errorBlock );

						systemError( "Import Fetch Error: " + err + "[Building imported transaction list]" );
					}

					fetchError = true;
				}
			}

			if( fetchError === false ) {

				this.processDataNext();
			} else {

				this.readInstructions();
			}
		} catch( err ) {

			systemError( "Error in Import >> processData:" + err );
		}
	},

	processDataNext: function() {

		try {

			if( ( this.currStartIndex + this.itemsPerPage ) < this.totalResults ) {
				//Continue fetching page data

				this.gdata_fetch_spreadsheet_data( this.sheetKey, this.pageId[this.currPageIdIndex][0], ( this.currStartIndex + this.itemsPerPage ), 100, this.checkData.bind( this ), this.ajaxFailure.bind( this ), 30 );
			} else {
				//Page is complete

				this.currPageIdIndex++;

				if( this.currPageIdIndex < this.pageId.length ) {
					//go to next page

					this.gdata_fetch_spreadsheet_data( this.sheetKey, this.pageId[this.currPageIdIndex][0], 1, 100, this.checkData.bind( this ), this.ajaxFailure.bind( this ), 30 );
				} else {
					//Sheet Completed

					if( this.importItemIndex < ( this.importItems.length - 1 ) ) {

						this.importItemIndex++;

						this.fetchSheetSections();
					} else {
						//All done

						this.updateProgressBar( 0 );

						this.parseData( 0, 250 );
					}
				}
			}
		} catch( err ) {

			systemError( "Error in Import >> processDataNext:" + err );
		}
	},

	insertNewAccount: function( accountString, accountCat ) {

		accountsDB.transaction(
			(
				function( transaction ) {

					if( this.importCatFound === false ) {

						transaction.executeSql( "INSERT INTO accountCategories( name, icon ) VALUES( ?, 'transfer_4.png' );", [ $L( "Imported Account" ) ] );
						//catOrder = rowid
						//change this to select to check for row, if no exist, then create unless blank

						this.importCatFound = true;
					}

					var qryAccountInsert = "INSERT INTO accounts ( acctName, acctNotes, acctCategory, sort, defaultAccount, frozen, hidden, acctLocked, lockedCode, transDescMultiLine, showTransTime, useAutoComplete, atmEntry ) VALUES( ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ? );";

					//Insert new Account
					if( accountString !== "" ) {

						transaction.executeSql(
								qryAccountInsert,
								[ accountString, '', accountCat, '1', 0, 0, 0, 0, '', 0, 0, 1, 0 ],
								function( transaction, result ) {

									this.addAccountListItem( accountCat, accountString, result.insertId );
								}.bind( this ),
								this.sqlErrorHandler.bind( this, qryAccountInsert ) );
					}

					//Insert new Category
					transaction.executeSql(
							"SELECT * FROM accountCategories;",
							[],
							function( transaction, catResults ) {

								var itemFound = false;

								for( var i = 0; i < catResults.rows.length; i++ ) {

									var row = catResults.rows.item( i );

									if( row['name'] === accountCat ) {

										itemFound = true;
									}
								}

								if( itemFound === false ) {

									var catInsertQry = "INSERT INTO accountCategories( name, icon, catOrder ) VALUES( ?, 'cash_1.png', ( SELECT COUNT( catOrder ) FROM accountCategories ) );";

									transaction.executeSql(
											catInsertQry,
											[ accountCat ],
											function( trans, results ){}.bind( this ),
											this.sqlErrorHandler.bind( this, catInsertQry ) );
								}
							}.bind( this ),
							this.sqlErrorHandler.bind( this, "SELECT * FROM accountCategories;" ) );
				}
			).bind( this ) );
	},

	parseData: function( currentStart, countLength ) {

		if( this.importedData.length <= 0 ) {

			this.endImportSystem( $L( "Imported 0 transactions..." ), true );
		} else {

			var qryInsertExpense = "";
			var values;
			var currentFinish = 0;

			accountsDB.transaction(
				(
					function( transaction ) {

						if( ( currentStart + countLength ) < this.importedData.length ) {

							currentFinish = currentStart + countLength;
						} else {

							currentFinish = this.importedData.length;
						}

						//cycle through this.importedData
						for( var i = currentStart; i < currentFinish; i++ ) {
/* DISABLED FOR NOW
							//For restoring category listings
							for( var j = 0; j < this.importedData[i]['category'].length; j++ ) {

								transaction.executeSql(
										"INSERT INTO transactionCategories( genCat, specCat ) SELECT ?, ? WHERE NOT EXISTS( SELECT 1 FROM transactionCategories WHERE genCat = ? AND specCat = ? );",
										[
											this.importedData[i]['category'][j]['category'],
											this.importedData[i]['category'][j]['category2'],
											this.importedData[i]['category'][j]['category'],
											this.importedData[i]['category'][j]['category2'],
										],
										null,
										this.sqlErrorHandler.bind( this, "Import -> Transaction Category Insert" )
									);
							}
*/
							//Determine Account Id
							var foundAccountId = -1;
							var foundLinkedAccountId = -1;

							if( typeof( this.accountList[this.importedData[i]['accountCat']] ) !== "undefined" &&
								typeof( this.accountList[this.importedData[i]['accountCat']][this.importedData[i]['account']] ) !== "undefined" ) {

								foundAccountId = this.accountList[this.importedData[i]['accountCat']][this.importedData[i]['account']];
							}

							if( typeof( this.accountList[this.importedData[i]['linkedAccountCat']] ) !== "undefined" &&
								typeof( this.accountList[this.importedData[i]['linkedAccountCat']][this.importedData[i]['linkedAccount']] ) !== "undefined" &&
								!isNaN( this.importedData[i]['linkedRecord'] ) &&
								this.importedData[i]['linkedRecord'] !== "" ) {

								foundLinkedAccountId = this.accountList[this.importedData[i]['linkedAccountCat']][this.importedData[i]['linkedAccount']];
							}

							if( foundAccountId !== -1 ) {

								if( this.importedData[i]['gtId'] && !isNaN( this.importedData[i]['gtId'] ) && this.importedData[i]['gtId'] !== "" ) {

									var linkedAccountId = ( foundLinkedAccountId != -1 ? foundLinkedAccountId : "" );
									var linkedTransactionId = ( ( foundLinkedAccountId != -1 && !isNaN( this.importedData[i]['linkedRecord'] ) && this.importedData[i]['linkedRecord'] !== "" ) ? parseInt( this.importedData[i]['linkedRecord'] ) : "" );

									var catBack = this.handleSplitTransactionInsert( this.importedData[i]['category'], parseInt( this.importedData[i]['gtId'] ), linkedTransactionId, transaction );

									qryInsertExpense = "REPLACE INTO transactions( itemId, desc, amount, checkNum, note, date, account, category, category2, linkedRecord, linkedAccount, cleared, repeatId ) VALUES( ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ? );";

									values = [
											parseInt( this.importedData[i]['gtId'] ),
											dirtyString( this.importedData[i]['desc'] ),
											this.importedData[i]['amount'],
											this.importedData[i]['checkNum'],
											dirtyString( this.importedData[i]['note'] ),
											this.importedData[i]['date'],
											foundAccountId,
											catBack['category'],
											catBack['category2'],
											linkedTransactionId,
											linkedAccountId,
											this.importedData[i]['cleared'],
											""
										];
								} else {
									//Adapt for split transactions
										//Need to get ID of this insert & use it on the split trans table
										//last_insert_rowid() after insert complete

									qryInsertExpense = "INSERT INTO transactions( desc, amount, checkNum, note, date, account, category, category2, linkedRecord, linkedAccount, cleared, repeatId ) VALUES( ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ? );";

									values = [
											dirtyString( this.importedData[i]['desc'] ),
											this.importedData[i]['amount'],
											this.importedData[i]['checkNum'],
											dirtyString( this.importedData[i]['note'] ),
											this.importedData[i]['date'],
											foundAccountId,
											this.importedData[i]['category'][0]['category'],
											this.importedData[i]['category'][0]['category2'],
											linkedTransactionId,
											linkedAccountId,
											this.importedData[i]['cleared'],
											""
										];
								}

								if( i === ( currentFinish - 1 ) ) {

									//Last Call
									transaction.executeSql(
												qryInsertExpense,
												values,
												this.parseDataHandler.bind( this, true, currentFinish, countLength ),
												this.sqlErrorHandler.bind( this, qryInsertExpense )
											);
								} else {

									transaction.executeSql(
												qryInsertExpense,
												values,
												null,
												this.sqlErrorHandler.bind( this, qryInsertExpense )
											);
								}
							} else {

								if( i === ( currentFinish - 1 ) ) {
									//Last Call

									this.parseDataHandler( false, currentFinish, countLength );
								}
							}

							//Update status
							var percentCompleted = ( ( ( i + 1 ) / this.importedData.length ) * 100 );
							percentCompleted = ( percentCompleted > 100 ? 100 : percentCompleted );

							this.updateLoadingSystem( true, $L( "Processing Data" ), percentCompleted.toFixed( 1 ) + $L( "% complete..." ), ( percentCompleted / 100 ) );
						}//End loop
					}
				).bind( this ) );
		}
	},

	parseDataHandler: function( valid, currentFinish, countLength ) {

		if( currentFinish < this.importedData.length ) {
			//Amount of items entered is less than items to be entered

			this.parseData( currentFinish, countLength );
		} else {
			//All items entered, close up

			this.updateLoadingNote( $L( "Loading Accounts" ) + "..." );

			accounts_obj['items_changed'] = true;

			this.zeroOverallBalance();
			this.loadAllAccounts( 0, 25, this.endImportSystem.bind( this, $L( valid ? "Imported " : "Imported up to " ) + this.importedData.length + $L( " transactions..." ), true ) );
		}
	},

	endImportSystem: function( importString, data ) {

		try {

			this.controller.stageController.setWindowProperties( { "blockScreenTimeout": false, "setSubtleLightbar": false } );
			//systemError( "Window Props (Import End): Timeout & Dimming" );
		} catch( err ) {

			systemError( "Window Props (Import end): " + err );
		}

		if( data === true ) {

			this.updateLoadingSystem( true, $L( "Import Complete" ), importString, 1 );

			//Show for 3 seconds then pop
			var closeFn = function() {

					this.controller.stageController.popScene();
				}.bind( this );

			var delayCloseFn = closeFn.delay( 3 );
		} else {

			this.updateLoadingSystem( true, $L( "Import Failed" ), importString, 0 );
		}
	},

	ajaxFailure: function( error_str ) {

		var errorBlock = this.controller.get( 'login-container-error' );
		Element.update( errorBlock, error_str );
		Element.show( errorBlock );

		this.showLoginContainer();
	},

	sqlErrorHandler: function( qry, transaction, error ) {

		systemError( "Import SQL Error: " + error.message + " (Code " + error.code + ") [" + qry + "]" );
	},

	deactivate: function( event ) {

		accounts_obj['items_changed'] = true;

		Mojo.Event.stopListening( this.controller.get( 'readInstructions' ), Mojo.Event.tap, this.readInstructionsEvent );
		Mojo.Event.stopListening( this.controller.get( 'submitUserData' ), Mojo.Event.tap, this.submitUserDataEvent );
		Mojo.Event.stopListening( this.controller.get( 'spreadSheetList' ), Mojo.Event.listTap, this.listTapHandlerEvent );
	},

	cleanup: function( event ) {

		try {

			this.controller.stageController.setWindowProperties( { "blockScreenTimeout": false, "setSubtleLightbar": false } );
		} catch( err ) {}

		try {
			window.clearTimeout( this.timeOutCheck );
		} catch( err ) {}
	}
} );
