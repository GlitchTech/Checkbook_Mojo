/* Copyright 2009 and forward GlitchTech Science.  All rights reserved. */

var PrefsAssistant = Class.create( commonModel, {

	initialize: function( $super ) {

		$super();

		this.pinLockHandlerEvent = this.pinLockHandler.bindAsEventListener( this );
		this.pinCodeTapEvent = this.pinCodeTap.bindAsEventListener( this );

		this.updateNoticeHandlerEvent = this.updateNoticeHandler.bindAsEventListener( this );
		this.dispColorHandlerEvent = this.dispColorHandler.bindAsEventListener( this );
		this.bsSaveHandlerEvent = this.bsSaveHandler.bindAsEventListener( this );
		this.errorReportingEvent = this.errorReportingHandler.bindAsEventListener( this );

		this.listTapHandlerEvent = this.listTapHandler.bindAsEventListener( this );
		this.listDeleteHandlerEvent = this.listDeleteHandler.bindAsEventListener( this );

		this.newAccountItemEvent = this.newAccountItem.bindAsEventListener( this );
		this.acctCatButtonHandlerEvent = this.acctCatButtonHandler.bindAsEventListener( this );
		this.trsnCatButtonHandlerEvent = this.trsnCatButtonHandler.bindAsEventListener( this );
		this.sendAccountSummaryEvent = this.sendAccountSummary.bindAsEventListener( this );

		this.defaultAccoutTappedEvent = this.defaultAccoutTapped.bindAsEventListener( this );

		this.purgeButtonTappedEvent = this.purgeButtonTapped.bindAsEventListener( this );
	},

	setup: function() {

		this.controller.setupWidget(
				"pinLock",
				{//Attributes
					trueValue: 1,
					trueLabel: $L( "On" ),
					falseValue: 0,
					falseLabel: $L( "Off" )
				},
				this.useCode = {
					value: checkbookPrefs['useCode']
				}
			);

		this.controller.setupWidget(
				"pinCodeDrawer",
				{
					unstyled: true
				},
				this.pinCodeDrawer = {
					open: ( checkbookPrefs['useCode'] == 1 ? true : false )
				}
			);

		this.controller.setupWidget(
				"pinCode",
				{
					hintText: $L( "Tap to set..." ),
				},
				this.code = {
					disabled: true,
					value: ( checkbookPrefs['useCode'] == 1 ? checkbookPrefs['code'] : "" )
				}
			);

		this.controller.setupWidget(
				"updateCheckNotification",
				{//Attributes
					trueValue: 1,
					trueLabel: $L( "Show" ),
					falseValue: 0,
					falseLabel: $L( "Hide" )
				},
				this.updateCheckNotification = {
					value: checkbookPrefs['updateCheckNotification']
				}
			);

		this.controller.setupWidget(
				"dispColor",
				{//Attributes
					trueValue: 1,
					trueLabel: $L( "Yes" ),
					falseValue: 0,
					falseLabel: $L( "No" )
				},
				this.dispColor = {
					value: checkbookPrefs['dispColor']
				}
			);

		this.controller.setupWidget(
				"bsSave",
				{//Attributes
					trueValue: 1,
					trueLabel: $L( "Yes" ),
					falseValue: 0,
					falseLabel: $L( "No" )
				},
				this.bsSave = {
					value: checkbookPrefs['bsSave']
				}
			);

		this.controller.setupWidget(
				"error-reporting",
				{//Attributes
					trueValue: 1,
					trueLabel: $L( "Yes" ),
					falseValue: 0,
					falseLabel: $L( "No" )
				},
				this.errorReporting = {
					value: checkbookPrefs['errorReporting']
				}
			);

		this.controller.setupWidget(
				'prefAccountList',
				{
					itemTemplate: 'prefs/accountItemTemplate',
					dividerTemplate:'prefs/dividerTemplate',
					dividerFunction: this.dividerFunc.bind( this ),

					hasNoWidgets: true,
					swipeToDelete: true,
					autoconfirmDelete: false,
					reorderable: false,

					addItemLabel: $L( "New Account" )
				},
				accounts_obj
			);

		/** UNTIL FIXED, HIDE EMAIL BUTTON **/
		this.controller.setupWidget(
				"emailButton",
				{},
				{
					buttonLabel: $L( "Email Account Summary" )
				}
			);

		this.controller.setupWidget(
				"purgeAllButton",
				{},
				{
					buttonLabel: $L( "Purge All Data" ),
					buttonClass: 'negative'
				}
			);

		var acctPrefsMenuModel = {
							visible: true,
							items: [
								Mojo.Menu.editItem,
								appMenuPrefAccountsDisabled,
								appMenuFeaturesDisabled,
								cbAboutItem,
								cbHelpItem
							]
						};

		this.controller.setupWidget( Mojo.Menu.appMenu, appMenuOptions, acctPrefsMenuModel );
		this.setupLoadingSystem();
		this.hideLoadingSystemNow();
	},

	ready: function() {

		this.controller.get( 'program-security-header' ).update( $L( "Program Security" ) );
		this.controller.get( 'pin-lock-label' ).update( $L( "PIN Lock" ) );
		this.controller.get( 'pin-code-label' ).update( $L( "PIN Code" ) );
		this.controller.get( 'general-options-header' ).update( $L( "General Options" ) );
		this.controller.get( 'update-notice-label' ).update( $L( "Update Notice" ) );
		this.controller.get( 'account-color-label' ).update( $L( "Use Account Colors" ) );
		this.controller.get( 'backswipe-save-label' ).update( $L( "Enable Backswipe Save" ) );
		this.controller.get( 'errorReportingGroup' ).update( $L( "Error Reporting" ) );
		this.controller.get( 'error-reporting-label' ).update( $L( "Report Bugs to GlitchTech" ) );

		this.controller.get( 'account-section-header' ).update( $L( "Accounts" ) );
		this.controller.get( 'default-account-header' ).update( $L( "Default Account" ) );
		this.controller.get( 'default-account-note' ).update( $L( "The default account will automatically open when the program is started." ) );

		this.controller.get( "addEditGroup" ).update( $L( "Add/Edit Categories" ) );
		this.controller.get( "acctCatButton" ).update( $L( "Edit Account Categories" ) );
		this.controller.get( "trsnCatButton" ).update( $L( "Edit Transaction Categories" ) );

		if( this.controller.get( "pinCodeDrawer" ).mojo.getOpenState() !== true ) {

			this.code['value'] = "";

			Element.removeClassName( this.controller.get( "pin-lock-row-item" ), "first" );
			Element.addClassName( this.controller.get( "pin-lock-row-item" ), "single" );

		} else {

			Element.addClassName( this.controller.get( "pin-lock-row-item" ), "first" );
			Element.removeClassName( this.controller.get( "pin-lock-row-item" ), "single" );
		}
	},

	//500ms before activate
	aboutToActivate: function() {

		this.fetchAccountPrefs();
	},

	//Scene made visible
	activate: function( event ) {

		Mojo.Event.listen( this.controller.get( 'pinLock' ), Mojo.Event.propertyChange, this.pinLockHandlerEvent );
		Mojo.Event.listen( this.controller.get( 'pinCode' ), Mojo.Event.tap, this.pinCodeTapEvent );

		Mojo.Event.listen( this.controller.get( 'updateCheckNotification' ), Mojo.Event.propertyChange, this.updateNoticeHandlerEvent );
		Mojo.Event.listen( this.controller.get( 'dispColor' ), Mojo.Event.propertyChange, this.dispColorHandlerEvent );
		Mojo.Event.listen( this.controller.get( 'bsSave' ), Mojo.Event.propertyChange, this.bsSaveHandlerEvent );
		Mojo.Event.listen( this.controller.get( 'error-reporting' ), Mojo.Event.propertyChange, this.errorReportingEvent );

		Mojo.Event.listen( this.controller.get( 'prefAccountList' ), Mojo.Event.listTap, this.listTapHandlerEvent );
		Mojo.Event.listen( this.controller.get( 'prefAccountList' ), Mojo.Event.listDelete, this.listDeleteHandlerEvent );
		Mojo.Event.listen( this.controller.get( 'prefAccountList' ), Mojo.Event.listAdd, this.newAccountItemEvent );

		Mojo.Event.listen( this.controller.get( 'acctCatButton' ), Mojo.Event.tap, this.acctCatButtonHandlerEvent );
		Mojo.Event.listen( this.controller.get( 'trsnCatButton' ), Mojo.Event.tap, this.trsnCatButtonHandlerEvent );

		Mojo.Event.listen( this.controller.get( 'emailButton' ), Mojo.Event.tap, this.sendAccountSummaryEvent );
		Mojo.Event.listen( this.controller.get( 'purgeAllButton' ), Mojo.Event.tap, this.purgeButtonTappedEvent );

		Mojo.Event.listen( this.controller.get( 'defaultAccount' ), Mojo.Event.tap, this.defaultAccoutTappedEvent );
	},

	/** Save code **/
	pinCodeHandler: function( newCode ) {

		//Fetch Spike
		accountsDB.transaction(
			(
				function( transaction ) {

					transaction.executeSql( "SELECT spike FROM prefs LIMIT 1;", [], this.savePinCode.bind( this, newCode ), this.sqlError.bind( this ) );
				}
			).bind( this ) );
			event.stop();
	},

	savePinCode: function( newCode, transaction, results ) {

		var row = results.rows.item( 0 );

		//Confirm use code set and code is valid
		if( this.useCode.value !== 1 || !newCode || typeof( newCode ) === "undefined" || newCode.length <= 0 || newCode === "" ) {

			checkbookPrefs['useCode'] = 0;
			checkbookPrefs['code'] = "";
		} else {

			checkbookPrefs['useCode'] = 1;
			checkbookPrefs['code'] = Mojo.Model.encrypt( row['spike'], newCode );;
		}

		this.code['value'] = checkbookPrefs['code'];
		this.controller.modelChanged( this.code );

		accountsDB.transaction(
			(
				function( transaction ) {

					transaction.executeSql( "UPDATE prefs SET useCode = ?, code = ?;", [ checkbookPrefs['useCode'], checkbookPrefs['code'] ], this.successHandler.bind( this ), this.sqlError.bind( this ) );
				}
			).bind( this ) );
	},

	pinLockHandler: function() {

		this.controller.get( "pinCodeDrawer" ).mojo.toggleState();

		if( this.controller.get( "pinCodeDrawer" ).mojo.getOpenState() !== true ) {

			Element.removeClassName( this.controller.get( "pin-lock-row-item" ), "first" );
			Element.addClassName( this.controller.get( "pin-lock-row-item" ), "single" );

		} else {

			Element.addClassName( this.controller.get( "pin-lock-row-item" ), "first" );
			Element.removeClassName( this.controller.get( "pin-lock-row-item" ), "single" );
		}

		this.pinCodeHandler( this.code['value'] );
	},

	pinCodeTap: function( event ) {

		event.stop();

		this.controller.showDialog(
				{
					template: 'dialogs/updatePIN-dialog',
					assistant: new updatePINDialog( this, this.pinCodeHandler.bind( this ) )
				}
			);

		//Scroll to top
		this.controller.getSceneScroller().mojo.revealTop( 0 );
	},

	/** Global Preferences Changed **/
	updateNoticeHandler: function() {

		checkbookPrefs['updateCheckNotification'] = this.updateCheckNotification.value;

		accountsDB.transaction(
			(
				function( transaction ) {

					transaction.executeSql( "UPDATE prefs SET updateCheckNotification = ?;", [ checkbookPrefs['updateCheckNotification'] ], this.successHandler.bind( this ), this.sqlError.bind( this ) );
				}
			).bind( this ) );
	},

	dispColorHandler: function() {

		checkbookPrefs['dispColor'] = this.dispColor.value;

		accountsDB.transaction(
			(
				function( transaction ) {

					transaction.executeSql( "UPDATE prefs SET dispColor = ?;", [ checkbookPrefs['dispColor'] ], this.successHandler.bind( this ), this.sqlError.bind( this ) );
				}
			).bind( this ) );
	},

	bsSaveHandler: function() {

		checkbookPrefs['bsSave'] = this.bsSave.value;

		accountsDB.transaction(
			(
				function( transaction ) {

					transaction.executeSql( "UPDATE prefs SET bsSave = ?;", [ checkbookPrefs['bsSave'] ], this.successHandler.bind( this ), this.sqlError.bind( this ) );
				}
			).bind( this ) );
	},

	errorReportingHandler: function() {

		checkbookPrefs['errorReporting'] = this.errorReporting.value;

		accountsDB.transaction(
			(
				function( transaction ) {

					transaction.executeSql( "UPDATE prefs SET errorReporting = ?;", [ checkbookPrefs['errorReporting'] ], this.successHandler.bind( this ), this.sqlError.bind( this ) );
				}
			).bind( this ) );
	},

	/** New Account Clicked **/
	newAccountItem: function( event ) {

		this.controller.stageController.pushScene( "addEdit-account" );
		event.stop();
	},

	/** Account Item tapped **/
	listTapHandler: function( event ) {

		if( event.item['locked'] == 1 ) {

			this.controller.stageController.pushScene( "login", "addEdit-account", event.item['lockedCode'], "back", event.item );
		} else {

			this.controller.stageController.pushScene( "addEdit-account", event.item );
		}

		event.stop();
	},

	/** Account Item deleted **/
	listDeleteHandler: function( event ) {

		this.deleteAccount(
				event.item['index'],
				function() {

					this.fetchAccountPrefs();
				}.bind( this ) );

		event.stop();
	},

	/** Change Default Account **/
	defaultAccoutTapped: function( event ) {

		var popupMenuItems = accounts_obj['popup'].clone();

		popupMenuItems.unshift( {
							label: $L( "Account Overview" ),
							command: -1
						} );

		var defaultId = -1;

		if( accounts_obj['defaultIndex'] >= 0 ) {

			defaultId = accounts_obj['items'][accounts_obj['defaultIndex']]['rowId'];
		}

		this.controller.popupSubmenu(
				{
					onChoose: this.defaultAccountPopupHandler,
					toggleCmd: defaultId,
					placeNear: event.target,
					items: popupMenuItems
				}
			);

		//End event
		event.stop();
	},

	defaultAccountPopupHandler: function( command ) {

		if( command && typeof( command ) !== "undefined" ) {

			this.updateDefaultAccount( command, this.fetchAccountPrefs.bind( this ) );
		}
	},

	acctCatButtonHandler: function( event ) {

		this.controller.stageController.pushScene( "account-categories" );
		event.stop();
	},

	trsnCatButtonHandler: function( event ) {

		this.controller.stageController.pushScene( "transaction-categories" );
		event.stop();
	},

	//Fix this calculations
	sendAccountSummary: function() {

		try {

			var bodyText = "";

			var totalBalance = 0;

			for( var i = 0; i < accounts_obj['items'].length; i++ ) {

				bodyText += accounts_obj['items'][i]['name'] + " - Balance " + formatAmount( accounts_obj['items'][i]['balance'] ) + "\n";

				totalBalance += parseFloat( accounts_obj['items'][i]['balance'] );
			}

			if( accounts_obj['items'].length > 0 ) {

				sendEmail( $L( "Account Summary" ), $L( "Total Balance " ) + formatAmount( totalBalance ) + "\n\n" + bodyText );
			} else {

				sendEmail( $L( "Account Summary" ), $L( "There are zero accounts in this system." ) );
			}
		} catch( err ) {

			Mojo.Controller.errorDialog( $L( "Error: " ) + err );
			systemError( "Email Summary Error: " + err );
		}
	},

	purgeButtonTapped: function( event ) {

		var hostScene = this;

		hostScene.controller.showAlertDialog( {
				onChoose: function( value ) {

					if( value === true ) {

						hostScene.controller.showAlertDialog( {
								onChoose: function( value ) {

									hostScene.deleteEverything();
								},
								title: $L( "Purge All Data" ),
								message: $L( "Are you sure? Remember this cannot be undone. This app will exit when process is complete." ),
								choices: [
									{
										label: $L( "Purge All Data" ),
										value: true,
										type: 'negative'
									}, {
										label: $L( "Cancel" ),
										value: false,
										type: 'dismiss'
									}
								]
							} );
					}
				},
				title: $L( "Purge All Data" ),
				message: $L( "This will delete all the data in this app." ),
				choices: [
					{
						label: $L( "Purge All Data" ),
						value: true,
						type: 'negative'
					}, {
						label: $L( "Cancel" ),
						value: false,
						type: 'dismiss'
					}
				]
			} );

		event.stop();
	},

	deleteEverything: function() {

		this.showLoadingSystem( $L( "Purge All Data" ), $L( "Please wait..." ), 0 );

		accountsDB.transaction(
			(
				function( transaction ) {

					transaction.executeSql( "DROP TABLE IF EXISTS budget;", [], this.successHandler.bind( this ), this.sqlError.bind( this ) );
					transaction.executeSql( "DROP TABLE IF EXISTS rules;", [], this.successHandler.bind( this ), this.sqlError.bind( this ) );

					transaction.executeSql( "DROP TABLE IF EXISTS accounts;", [], this.successHandler.bind( this ), this.sqlError.bind( this ) );
					transaction.executeSql( "DROP TABLE IF EXISTS accountCategories;", [], this.successHandler.bind( this ), this.sqlError.bind( this ) );

					transaction.executeSql( "DROP TABLE IF EXISTS transactions;", [], this.successHandler.bind( this ), this.sqlError.bind( this ) );
					transaction.executeSql( "DROP TABLE IF EXISTS transactionCategories;", [], this.successHandler.bind( this ), this.sqlError.bind( this ) );
					transaction.executeSql( "DROP TABLE IF EXISTS transactionSplit;", [], this.successHandler.bind( this ), this.sqlError.bind( this ) );

					transaction.executeSql( "DROP TABLE IF EXISTS repeats;", [], this.successHandler.bind( this ), this.sqlError.bind( this ) );

					transaction.executeSql( "DROP TABLE IF EXISTS prefs;", [], this.deleteEverythingDone.bind( this ), this.sqlError.bind( this ) );
				}
			).bind( this ) );
	},

	deleteEverythingDone: function( trsn, results ) {

		Mojo.Controller.getAppController().closeAllStages();
	},

	fetchAccountPrefs: function() {

		try {

			this.controller.modelChanged( accounts_obj );

			if( accounts_obj['defaultIndex'] >= 0 ) {

				this.controller.get( 'defaultAccountWrapper' ).update( "<img src='./images/" + accounts_obj['items'][accounts_obj['defaultIndex']]['categoryIcon'] + "' alt='' class='acctIcon' style='margin-right:10px;padding-top:5px;' /><div class='title'>" + accounts_obj['items'][accounts_obj['defaultIndex']]['name'] + "</div>" );
			} else {

				this.controller.get( 'defaultAccountWrapper' ).update( "<div class='title'>" + $L( "Account Overview" ) + "</div>" );
			}
		} catch( err ) {

			Mojo.Controller.errorDialog( $L( "Error: " ) + err );

			systemError( "Prefs Acct Disp Error: " + err );
		}
	},

	dividerFunc: function( itemModel ) {

			return itemModel.category;
	},

	deactivate: function( event ) {

		Mojo.Event.stopListening( this.controller.get( 'pinLock' ), Mojo.Event.propertyChange, this.pinLockHandlerEvent );
		Mojo.Event.stopListening( this.controller.get( 'pinCode' ), Mojo.Event.tap, this.pinCodeTapEvent );

		Mojo.Event.stopListening( this.controller.get( 'updateCheckNotification' ), Mojo.Event.propertyChange, this.updateNoticeHandlerEvent );
		Mojo.Event.stopListening( this.controller.get( 'dispColor' ), Mojo.Event.propertyChange, this.dispColorHandlerEvent );
		Mojo.Event.stopListening( this.controller.get( 'bsSave' ), Mojo.Event.propertyChange, this.bsSaveHandlerEvent );
		Mojo.Event.stopListening( this.controller.get( 'error-reporting' ), Mojo.Event.propertyChange, this.errorReportingEvent );

		Mojo.Event.stopListening( this.controller.get( 'prefAccountList' ), Mojo.Event.listTap, this.listTapHandlerEvent );
		Mojo.Event.stopListening( this.controller.get( 'prefAccountList' ), Mojo.Event.listDelete, this.listDeleteHandlerEvent );
		Mojo.Event.stopListening( this.controller.get( 'prefAccountList' ), Mojo.Event.listAdd, this.newAccountItemEvent );

		Mojo.Event.stopListening( this.controller.get( 'acctCatButton' ), Mojo.Event.tap, this.acctCatButtonHandlerEvent );
		Mojo.Event.stopListening( this.controller.get( 'trsnCatButton' ), Mojo.Event.tap, this.trsnCatButtonHandlerEvent );

		Mojo.Event.stopListening( this.controller.get( 'emailButton' ), Mojo.Event.tap, this.sendAccountSummaryEvent );
		Mojo.Event.stopListening( this.controller.get( 'purgeAllButton' ), Mojo.Event.tap, this.purgeButtonTappedEvent );

		Mojo.Event.stopListening( this.controller.get( 'defaultAccount' ), Mojo.Event.tap, this.defaultAccoutTappedEvent );
	},

	cleanup: function( event ) {
	}
} );
