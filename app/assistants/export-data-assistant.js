/* Copyright 2009 and forward GlitchTech Science.  All rights reserved. */

var ExportDataAssistant = Class.create( gdataModel, {

	initialize: function( $super ) {

		$super();

		this.submitUserDataEvent = this.submitUserData.bindAsEventListener( this );
		this.acctTappedEvent = this.acctTapped.bindAsEventListener( this );

		this.timeOutCheck = null;
	},

	setup: function() {

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

		//Setup account choosing
		this.acctListModel = {
			items: []
		};

		//Prepare attribute data
		this.dataAttr = {
			itemTemplate:'export-data/listItemTemplate',

			hasNoWidgets: true,
			swipeToDelete: false,
			autoconfirmDelete: false,
			reorderable: false
		};

		this.controller.setupWidget( 'accountList', this.dataAttr, this.acctListModel );

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

		this.exportCmdButtons = {
								visible: false,
								items: [
									{},
									{
										items: [
											{
												label: $L( 'Export Accounts' ),
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

		this.controller.setupWidget( Mojo.Menu.commandMenu, {}, this.exportCmdButtons );

		this.setupLoadingSystem();

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

		this.controller.get( 'export-header' ).update( $L( "Export Data" ) );
		this.controller.get( 'login-container-header' ).update( $L( "Google Account" ) );
		this.controller.get( 'login-container-info-box' ).update( $L( "Enter your Google Spreadsheets information to export all your financial data from your device to <a href='http://docs.google.com/'>Google Documents</a>." ) );
		this.controller.get( 'save-login-label' ).update( $L( "Save Login Information" ) );
		this.controller.get( 'account-container-header' ).update( $L( "Select Accounts to Export" ) );
	},

	//500ms before activate
	aboutToActivate: function() {

		this.updateLoadingSystem( false, "", "", 0 );

		Element.show( this.controller.get( 'loginContainer' ) );
		Element.hide( this.controller.get( 'acctContainer' ) );

		this.exportCmdButtons['visible'] = false;
		this.controller.modelChanged( this.exportCmdButtons );
	},

	activate: function() {

		Mojo.Event.listen( this.controller.get( 'submitUserData' ), Mojo.Event.tap, this.submitUserDataEvent );
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

	/** Authenticate **/
	authenticateWithGoogle: function( user, pass ) {

		this.hideError();

		this.updateLoadingSystem( true, $L( "Retrieving key..." ), "", 0 );

		this.gdata_authenticate( user, pass, "writely", this.prepareSheet.bind( this ), this.ajaxFailureOne.bind( this ), 10 );
	},

	prepareSheet: function() {

		accountsDB.transaction(
			(
				function( transaction ) {

					var accountQry = "SELECT *," +
							" ( SELECT accountCategories.icon FROM accountCategories WHERE accountCategories.name = accounts.acctCategory ) AS acctCategoryIcon," +
							" ( SELECT accountCategories.catOrder FROM accountCategories WHERE accountCategories.name = accounts.acctCategory ) AS acctCatOrder" +
							" FROM accounts " +
							" ORDER BY acctCatOrder, acctName;";

					transaction.executeSql( accountQry, [], this.choseAccounts.bind( this ), this.sqlErrorHandler.bind( this, accountQry ) );
				}
			).bind( this ) );
	},

	choseAccounts: function( transaction, results ) {

		this.acctListModel['items'].clear();

		for( var i = 0; i < results.rows.length; i++ ) {

			var row = results.rows.item( i );

			this.acctListModel['items'].push(
							{
								itemId: i,
								acctId: row['acctId'],
								name: row['acctName'],
								cat: row['acctCategory'],
								icon: row['acctCategoryIcon'],
								selectStatus: 'true'
							}
						);
		}

		this.controller.get( 'accountList' ).mojo.noticeUpdatedItems( 0, this.acctListModel.items );
		this.controller.get( 'accountList' ).mojo.setLength( this.acctListModel.items.length );

		Mojo.Event.listen( this.controller.get( 'accountList' ), Mojo.Event.listTap, this.acctTappedEvent );

		this.updateLoadingSystem( false, "", "", 0 );

		Element.hide( this.controller.get( 'loginContainer' ) );
		Element.show( this.controller.get( 'acctContainer' ) );

		this.exportCmdButtons['visible'] = true;
		this.controller.modelChanged( this.exportCmdButtons );
	},

	acctTapped: function( event ) {

		var refId = event.item['itemId'];

		if( event.item['selectStatus'] != '' ) {

			this.acctListModel['items'][refId]['selectStatus'] = '';
		} else {

			this.acctListModel['items'][refId]['selectStatus'] = 'true';
		}

		this.controller.get( 'accountList' ).mojo.noticeUpdatedItems( refId, this.acctListModel['items'].slice( refId, refId + 1 ) );
	},

	handleCommand: function( event ) {

		if( event.type === Mojo.Event.command ) {

			switch( event.command ) {

				case 'acctChoose':
					event.stop();
					this.processAccountsSelected();
					break;
				case 'all':
					for( var i = 0; i < this.acctListModel['items'].length; i++ ) {

						this.acctListModel['items'][i]['selectStatus'] = 'true';
					}

					this.controller.get( 'accountList' ).mojo.noticeUpdatedItems( 0, this.acctListModel['items'] );
					event.stop;
					break;
				case 'none':
					for( var i = 0; i < this.acctListModel['items'].length; i++ ) {

						this.acctListModel['items'][i]['selectStatus'] = '';
					}

					this.controller.get( 'accountList' ).mojo.noticeUpdatedItems( 0, this.acctListModel['items'] );
					event.stop;
					break;
				case 'invert':
					for( var i = 0; i < this.acctListModel['items'].length; i++ ) {

						if( this.acctListModel['items'][i]['selectStatus'] != '' ) {

							this.acctListModel['items'][i]['selectStatus'] = '';
						} else {

							this.acctListModel['items'][i]['selectStatus'] = 'true';
						}
					}

					this.controller.get( 'accountList' ).mojo.noticeUpdatedItems( 0, this.acctListModel['items'] );
					event.stop;
					break;
			}
		}
	},

	processAccountsSelected: function() {

		var errorBlock = this.controller.get( 'upload-container-error' );
		Element.hide( errorBlock );
		Element.update( errorBlock, "" );

		this.hideError();
		this.updateLoadingSystem( true, $L( "Retrieving data..." ), "", 0 );

		try {

			this.controller.stageController.setWindowProperties( { "blockScreenTimeout": true, "setSubtleLightbar": true } );
			//systemError( "Window Props (Export Start): Timeout & Dimming" );
		} catch( err ) {

			systemError( "Window Props (Export Start): " + err );
		}

		Mojo.Event.stopListening( this.controller.get( 'accountList' ), Mojo.Event.listTap, this.acctTappedEvent );

		this.exportCmdButtons['visible'] = false;
		this.controller.modelChanged( this.exportCmdButtons );

		var acctList = '';

		//find out which are checked, combine into list (comma seps)
		for( var i = 0; i < this.acctListModel['items'].length; i++ ) {

			if( this.acctListModel['items'][i]['selectStatus'] != '' ) {

				acctList += this.acctListModel['items'][i]['acctId'] + ',';
			}
		}

		acctList = acctList.replace( /,$/, "" );//Remove last , if exists

		if( acctList == "" ) {

			this.sheetCreated( 0 );
		} else {

			//fetch all finance data, use SQL to make each line a CSV
			accountsDB.transaction(
				(
					function( transaction ) {

						var expenseQry = "SELECT *, ( SELECT accounts.acctName FROM accounts WHERE accounts.acctId = transactions.account ) AS accountName, ( SELECT accounts.acctName FROM accounts WHERE accounts.acctId = transactions.linkedAccount ) AS linkedAccountName, ( SELECT accounts.acctCategory FROM accounts WHERE accounts.acctId = transactions.account ) AS accountCat, ( SELECT accounts.acctCategory FROM accounts WHERE accounts.acctId = transactions.linkedAccount ) AS linkedAccountCat FROM transactions WHERE account IN ( " + acctList + " ) ORDER BY accountName, accountCat, date;";

						transaction.executeSql( expenseQry, [], this.initNewSheet.bind( this ), this.sqlErrorHandler.bind( this, expenseQry ) );
					}
				).bind( this ) );
		}
	},

	initNewSheet: function( transaction, results ) {

		this.updateLoadingSystem( true, $L( "Preparing Data" ), $L( "Please wait..." ), 0 );

		var currAcctId = 'NO_ACCOUNT_ID';
		var tdi = -1;

		var transactionData = new Array();

		this.createNewSheet( results, transactionData, currAcctId, tdi, 0, 100 );
	},

	createNewSheet: function( results, transactionData, currAcctId, tdi, startIndex, stepSize ) {

		var endIndex = 0;

		if( ( startIndex + stepSize ) < results.rows.length ) {

			endIndex = startIndex + stepSize;
		} else {

			endIndex = results.rows.length;
		}

		for( var i = startIndex; i < endIndex; i++ ) {
			//copy break up & defer from transactions

			var row = results.rows.item( i );

			if( currAcctId != row['account'] ) {

				currAcctId = row['account'];
				tdi++;
				transactionData[tdi] = new Array();
				transactionData[tdi][0] = row['accountName'];
				transactionData[tdi][1] = "account,accountCat,date,amount,description,cleared,checkNum,note,gtId,gtCat,gtLinkId,gtLinkedAccount,gtLinkedAccountCat\n";
				transactionData[tdi][2] = row['accountCat'];
				transactionData[tdi][3] = row['account'];//Id
			}

			var dateObj = new Date( parseInt( row['date'] ) );

			transactionData[tdi][1] += '"' + cleanString( row['accountName'] ) + '",' +
										'"' + cleanString( row['accountCat'] ) + '",' +
										'"' + formatDate( dateObj, 'special' ) + '",' +
										'"' + formatAmount( row['amount'] ) + '",' +
										'"' + cleanString( row['desc'] ) + '",' +
										'"' + ( row['cleared'] == 1 ? 'Yes' : 'No' ) + '",' +
										'"' + cleanString( row['checkNum'] ) + '",' +
										'"' + cleanString( row['note'] ) + '",' +
										'"' + row['itemId'] + '",' +
										'"' + ( row['category'] + ( row['category2'] === null ? "" : "|" + row['category2'] ) ) + '",' +
										'"' + row['linkedRecord'] + '",' +
										'"' + cleanString( row['linkedAccountName'] ) + '",' +
										'"' + cleanString( row['linkedAccountCat'] ) + '"\n';

			this.updateProgressBar( i / results.rows.length );
		}

		if( endIndex < results.rows.length ) {
			//slightly delay loading so UI doesn't crash

			var newCreateNewSheet = this.createNewSheet.bind( this, results, transactionData, currAcctId, tdi, endIndex, stepSize );

			newCreateNewSheet.defer();
		} else {

			this.updateProgressBar( 0 );
			this.uploadNewSheet( transactionData, 0 );
		}
	},

	uploadNewSheet: function( transactionData, i ) {

		if( transactionData.length <= 0 ) {

			this.sheetCreated( 0 );
		}

		var docTitle = transactionData[i][0] + " [" + transactionData[i][2] + "] [" + formatDate( new Date(), { date: 'short', time: '' } ) + "]";

		this.updateLoadingSystem( true, $L( "Uploading Spreadsheet" ), docTitle + "<br />(" + ( parseInt( i ) + 1 ) + $L( " of " ) + transactionData.length + ")", ( parseInt( i ) + 1 ) / transactionData.length );

		docTitle = "[" + $L( "Checkbook" ) + "] " + docTitle;

		/*
		this.gdata_upload_spreadsheet( docTitle, [{ colId1: colConent1, colId2: colConent2 },{ colId1: colConent1, colId2: colConent2 }], successFn, failureFn, timeDelay )
		*/

		//Too long?

		//this.gdata_upload_spreadsheet( docTitle, transactionData[i][1], this.uploadNewSheetSuccess.bind( this, i, transactionData ), this.ajaxFailureTwo.bind( this ), 60 );
		this.gdata_upload_file( docTitle, transactionData[i][1], this.uploadNewSheetSuccess.bind( this, i, transactionData ), this.ajaxFailureTwo.bind( this ), 60 );
	},

	uploadNewSheetSuccess: function( i, transactionData, response ) {

		//Uncheck item i in list
		for( var j = 0; j < this.acctListModel['items'].length; j++ ) {

			if( this.acctListModel['items'][j]['acctId'] === transactionData[i][3] ) {

				this.acctListModel['items'][j]['selectStatus'] = "";
			}
		}

		this.controller.modelChanged( this.acctListModel );

		//Advance to next item
		i++;

		if( i < transactionData.length ) {

			this.uploadNewSheet( transactionData, i );
		} else {

			this.sheetCreated( transactionData.length );
		}
	},

	sheetCreated: function( itemCount ) {

		try {

			this.controller.stageController.setWindowProperties( { "blockScreenTimeout": false, "setSubtleLightbar": false } );
		} catch( err ) {

			systemError( "Window Props (Export End): " + err );
		}

		this.updateLoadingSystem( true, $L( "Export Complete" ), $L( "Exported " ) + itemCount + ( itemCount != 1 ? $L( " accounts." ) : $L( " account." ) ), 1 );

		//Show for 3 seconds then pop
		var closeFn = function() {

				this.controller.stageController.popScene();
			}.bind( this );

		var delayCloseFn = closeFn.delay( 3 );
	},

	ajaxFailureOne: function( error_str ) {

		//Show user/pass items again
		Element.show( this.controller.get( 'loginContainer' ) );
		Element.hide( this.controller.get( 'acctContainer' ) );

		this.exportCmdButtons['visible'] = false;
		this.controller.modelChanged( this.exportCmdButtons );

		var errorBlock = this.controller.get( 'login-container-error' );
		Element.update( errorBlock, error_str );
		Element.show( errorBlock );
	},

	ajaxFailureTwo: function( error_str ) {

		//Show export account list
		Element.hide( this.controller.get( 'loginContainer' ) );
		Element.show( this.controller.get( 'acctContainer' ) );

		this.exportCmdButtons['visible'] = true;
		this.controller.modelChanged( this.exportCmdButtons );

		var errorBlock = this.controller.get( 'upload-container-error' );
		Element.update( errorBlock, error_str );
		Element.show( errorBlock );
	},

	sqlErrorHandler: function( qry, transaction, error ) {

		systemError( "Export SQL Error: " + error.message + " (Code " + error.code + ") [" + qry + "]" );
	},

	deactivate: function( event ) {

		Mojo.Event.stopListening( this.controller.get( 'submitUserData' ), Mojo.Event.tap, this.submitUserDataEvent );
	},

	cleanup: function( event ) {

		Mojo.Log.info( "ExportDataAssistant - cleanup" );

		try {

			this.controller.stageController.setWindowProperties( { "blockScreenTimeout": false, "setSubtleLightbar": false } );
		} catch( err ) {}

		try {
			window.clearTimeout( this.timeOutCheck );
		} catch( err ) {}
	}
} );
