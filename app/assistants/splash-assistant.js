/* Copyright 2009 and forward GlitchTech Science.  All rights reserved. */

var SplashAssistant = Class.create( commonModel, {

	initialize: function( $super ) {

		$super();

		this.launched = false;
		this.firstRun = false;

		/** Sort Options **/
		//This must be number based for sanity
		accountSortOptionsModel = {
				toggleCmd: checkbookPrefs['custom_sort'],
				items: [
					{
						label: $L( "Custom Category" ),
						command: "SORT_COMMAND" + "0",
						query: "acctCatOrder, acctCategory COLLATE NOCASE, sect_order, acctName COLLATE NOCASE"
					}, {
						label: $L( "Custom Account" ),
						command: "SORT_COMMAND" + "1",
						query: "sect_order, acctName COLLATE NOCASE, acctCatOrder, acctCategory COLLATE NOCASE"
					}, {
						label: $L( "Alphabetical Name" ),
						command: "SORT_COMMAND" + "2",
						query: "acctName COLLATE NOCASE, acctCategory COLLATE NOCASE"
					}, {
						label: $L( "Alphabetical Category" ),
						command: "SORT_COMMAND" + "3",
						query: "acctCategory COLLATE NOCASE, acctName COLLATE NOCASE"
					}
				]
			};

		bal_view = 4;

		this._binds = {
			successHandler: this.successHandler.bind( this ),
			updateError: this.qryUpdateError.bind( this ),
			setupError: this.qrySetupError.bind( this )
		};
	},

	setup: function() {

		/** Connect to DB **/
		try {

			accountsDB = openDatabase( "ext:checkbookData" );

			if( !accountsDB ) {

				Mojo.Controller.getAppController().showBanner( $L( "DB failed to open." ), "", "cbError" );

				this.closeApp();
			}
		} catch( err ) {

			Mojo.Controller.getAppController().showBanner( $L( "Error: " ) + err, "", "cbError" );
			systemError( "DB Open error: " + err );

			this.closeApp();
		}

		this.controller.setupWidget( Mojo.Menu.appMenu, appMenuOptions, { visible: false } );

		this.setupLoadingSystem();
	},

	ready: function() {
	},

	//Beta
	aboutToActivate: function() {

		this.updateLoadingSystem( true, $L( "Loading Checkbook" ), $L( "Checking database version..." ), 0 );

		//Check and launch
		this.checkDBVersion();
	},

	activate: function() {
	},

	/****************************/
	/** Check Database version **/
	/****************************/
	checkDBVersion: function() {

		this.updateLoadingSystem( true, $L( "Loading Checkbook" ), $L( "Checking database version..." ), 0 );

		accountsDB.transaction(
			(
				function( transaction ) {

					transaction.executeSql( "SELECT * FROM prefs LIMIT 1;", [], this.checkDBVersionSuccess.bind( this ), this.checkDBVersionFailure.bind( this ) );
				}
			).bind( this ) );
	},

	checkDBVersionSuccess: function( transaction, results ) {

		//User data version
		var currVersion = results.rows.item(0)['dbVer'];

		//DB Version
		var versionCheck = 21;

		if( currVersion === versionCheck && this.launched === false ) {

			//Prevent accidental multiple launches
			this.launched = true;

			//setup pref object
			checkbookPrefs['version'] = currVersion;
			checkbookPrefs['errorReporting'] = results.rows.item(0)['errorReporting'];

			checkbookPrefs['useCode'] = results.rows.item(0)['useCode'];
			checkbookPrefs['code'] = results.rows.item(0)['code'];

			checkbookPrefs['saveGSheetsData'] = results.rows.item(0)['saveGSheetsData'];
			checkbookPrefs['gSheetUser'] = results.rows.item(0)['gSheetUser'];
			checkbookPrefs['gSheetPass'] = results.rows.item(0)['gSheetPass'];

			checkbookPrefs['updateCheck'] = results.rows.item(0)['updateCheck'];
			checkbookPrefs['updateCheckNotification'] = results.rows.item(0)['updateCheckNotification'];

			checkbookPrefs['dispColor'] = results.rows.item(0)['dispColor'];
			checkbookPrefs['bsSave'] = results.rows.item(0)['bsSave'];

			checkbookPrefs['custom_sort'] = results.rows.item(0)['custom_sort'];

			checkbookPrefs['Metrix'] = new Metrix();//Instantiate Metrix Library

			this.nduidCheck();

			if( this.firstRun === true ) {

				checkbookPrefs['updateCheck'] = "FIRST_RUN";
			}

			accounts_obj = {
				items: [],
				popup: [],
				items_changed: true,
				defaultIndex: -1,
				totalBalance: [ 0, 0, 0, 0, 0 ]
			};

			this.updateLoadingSystem( true, $L( "Loading Checkbook" ), $L( "Loading Accounts" ) + "...", 0 );

			//Check for recurring updates using the repeating system
			this.repeat_updateAll( this.loadAllAccounts.bind( this, 0, 25, this.launchMain.bind( this ) ) );
		} else if( currVersion > versionCheck ) {

			this.updateLoadingSystem( true, $L( "Loading Checkbook" ), $L( "Something has gone very wrong." ), 0 );
		} else if( currVersion >= 1 ) {

			this.updateDBStructure( currVersion );
		} else {

			//Build the initial DB
			this.updateLoadingSystem( true, $L( "Loading Checkbook" ), $L( "Creating application database..." ), 0 );
			this.buildInitialDB();
		}
	},

	updateDBStructure: function( currVersion ) {

		this.updateLoadingSystem( true, $L( "Loading Checkbook" ), $L( "Updating database..." ), 0 );

		accountsDB.transaction(
			(
				function( transaction ) {

					var do_final_stage = true;
					var versionCheck = 1;

					switch( currVersion ) {
						case 1:
							transaction.executeSql( "ALTER TABLE accounts ADD COLUMN bal_view INTEGER NOT NULL DEFAULT 0;", [], this._binds['successHandler'], this._binds['updateError'] );

							versionCheck = 2;
						case 2:
							transaction.executeSql( "UPDATE accounts SET sort = 0;", [], this._binds['successHandler'], this._binds['updateError'] );

							versionCheck = 3;
						case 3:
							transaction.executeSql( "ALTER TABLE accounts ADD COLUMN runningBalance INTEGER NOT NULL DEFAULT 0;", [], this._binds['successHandler'], this._binds['updateError'] );

							versionCheck = 4;
						case 4:
							transaction.executeSql( "ALTER TABLE accounts ADD COLUMN checkField INTEGER NOT NULL DEFAULT 0;", [], this._binds['successHandler'], this._binds['updateError'] );
							transaction.executeSql( "ALTER TABLE expenses ADD COLUMN checkNum TEXT;", [], this._binds['successHandler'], this._binds['updateError'] );
							transaction.executeSql( "ALTER TABLE prefs ADD COLUMN repeatUpdate TEXT;", [], this._binds['successHandler'], this._binds['updateError'] );

							versionCheck = 5;
						case 5:
							transaction.executeSql( "ALTER TABLE accounts ADD COLUMN hideNotes INTEGER NOT NULL DEFAULT 0;", [], this._binds['successHandler'], this._binds['updateError'] );
							transaction.executeSql( "ALTER TABLE prefs ADD COLUMN updateCheck TEXT;", [], this._binds['successHandler'], this._binds['updateError'] );

							versionCheck = 6;
						case 6:
							transaction.executeSql( "ALTER TABLE accounts ADD COLUMN enableCategories INTEGER NOT NULL DEFAULT 1;", [], this._binds['successHandler'], this._binds['updateError'] );
							transaction.executeSql( "DELETE FROM expenseCategories WHERE specCat = '';", [], this._binds['successHandler'], this._binds['updateError'] );

							versionCheck = 7;
						case 7:
							//I am overwritten by case 8
							versionCheck = 8;
						case 8:
							//Localize Expense Categories
							transaction.executeSql( "DELETE FROM expenseCategories;", [], this._binds['successHandler'], this._binds['updateError'] );

							var qryExpenseCategories = "INSERT INTO expenseCategories( genCat, specCat ) VALUES( ?, ? );";

							for( var i = 0; i < oriTransCat.length; i++ ) {

								transaction.executeSql( qryExpenseCategories, [ $L( oriTransCat[i]['genCat'] ), $L( oriTransCat[i]['specCat'] ) ], this._binds['successHandler'], this._binds['updateError'] );
							}

							//DB Updates
							transaction.executeSql( "ALTER TABLE accountCategories ADD COLUMN color TEXT NOT NULL DEFAULT 'green';", [], this._binds['successHandler'], this._binds['updateError'] );
							transaction.executeSql( "ALTER TABLE prefs ADD COLUMN synergyAcctId TEXT;", [], this._binds['successHandler'], this._binds['updateError'] );
							transaction.executeSql( "ALTER TABLE prefs ADD COLUMN synergyCalId TEXT;", [], this._binds['successHandler'], this._binds['updateError'] );

							versionCheck = 9;
						case 9:
							transaction.executeSql( "ALTER TABLE prefs ADD COLUMN updateCheckNotification INTEGER NOT NULL DEFAULT 1;", [], this._binds['successHandler'], this._binds['updateError'] );
							transaction.executeSql( "ALTER TABLE prefs ADD COLUMN dispColor INTEGER NOT NULL DEFAULT 0;", [], this._binds['successHandler'], this._binds['updateError'] );
							transaction.executeSql( "ALTER TABLE prefs ADD COLUMN bsSave INTEGER NOT NULL DEFAULT 1;", [], this._binds['successHandler'], this._binds['updateError'] );

							versionCheck = 10;
						case 10:
							transaction.executeSql( "ALTER TABLE accounts ADD COLUMN sect_order INTEGER NOT NULL DEFAULT 0;", [], this._binds['successHandler'], this._binds['updateError'] );
							transaction.executeSql( "ALTER TABLE accounts ADD COLUMN hide_cleared INTEGER NOT NULL DEFAULT 0;", [], this._binds['successHandler'], this._binds['updateError'] );
							transaction.executeSql( "ALTER TABLE prefs ADD COLUMN custom_sort INTEGER NOT NULL DEFAULT 0;", [], this._binds['successHandler'], this._binds['updateError'] );
							transaction.executeSql( "ALTER TABLE accountCategories ADD COLUMN view_status INTEGER NOT NULL DEFAULT 1;", [], this._binds['successHandler'], this._binds['updateError'] );

							//setup server connections
							transaction.executeSql( "ALTER TABLE prefs ADD COLUMN gts_name TEXT;", [], this._binds['successHandler'], this._binds['updateError'] );
							transaction.executeSql( "ALTER TABLE prefs ADD COLUMN gts_pass TEXT;", [], this._binds['successHandler'], this._binds['updateError'] );
							transaction.executeSql( "ALTER TABLE prefs ADD COLUMN gts_last_connection TEXT;", [], this._binds['successHandler'], this._binds['updateError'] );
							transaction.executeSql( "ALTER TABLE accounts ADD COLUMN last_sync TEXT;", [], this._binds['successHandler'], this._binds['updateError'] );
							transaction.executeSql( "ALTER TABLE expenses ADD COLUMN last_sync TEXT;", [], this._binds['successHandler'], this._binds['updateError'] );
							transaction.executeSql( "ALTER TABLE accountCategories ADD COLUMN last_sync TEXT;", [], this._binds['successHandler'], this._binds['updateError'] );
							transaction.executeSql( "ALTER TABLE expenseCategories ADD COLUMN last_sync TEXT;", [], this._binds['successHandler'], this._binds['updateError'] );

							versionCheck = 11;
						case 11:
							transaction.executeSql( "DROP TABLE IF EXISTS budgets;", [], this._binds['successHandler'], this._binds['updateError'] );
							transaction.executeSql( "CREATE TABLE budgets( budgetId INTEGER PRIMARY KEY ASC, category TEXT, spending_limit REAL, span INTEGER, rollOver INTEGER, budgetOrder INTEGER );", [], this._binds['successHandler'], this._binds['updateError'] );

							versionCheck = 12;
						case 12:
							transaction.executeSql( "UPDATE accounts SET sect_order = ( SELECT IFNULL( COUNT( * ), 0 ) FROM accounts );", [], this._binds['successHandler'], this._binds['updateError'] );

							versionCheck = 13;
						case 13:
							//Update dbVer but do not check version
							versionCheck = 14;
							do_final_stage = false;

							transaction.executeSql( "UPDATE prefs SET dbVer = ?;", [ versionCheck ], this._binds['successHandler'], this._binds['updateError'] );

							//Delete all trsn cats that contain a ~
							transaction.executeSql( "DELETE FROM expenseCategories WHERE genCat LIKE '%~%' OR specCat LIKE '%~%';", [], this._binds['successHandler'], this._binds['updateError'] );
							transaction.executeSql( "UPDATE expenses SET category = ? WHERE category LIKE '%~%';", [ $L( "Uncategorized" ) + "|" + $L( "Other" ) ], this._binds['successHandler'], this._binds['updateError'] );

							//Prepare for encryption
							transaction.executeSql( "ALTER TABLE prefs ADD COLUMN spike TEXT;", [], this._binds['successHandler'], this._binds['updateError'] );
							transaction.executeSql( "SELECT acctId, lockedCode FROM accounts", [], this.update_encrypt_codes.bind( this, "account", "" ), this._binds['updateError'] );
							break;
						case 14:
							//Create account transaction sort data table
							transaction.executeSql( "DROP TABLE IF EXISTS acctTrsnSortOptn;", [], this._binds['successHandler'], this._binds['updateError'] );

							transaction.executeSql( "CREATE TABLE acctTrsnSortOptn( sortId INTEGER PRIMARY KEY ASC, label TEXT, sortGroup TEXT, groupOrder INTEGER NOT NULL DEFAULT 0, desc TEXT, qry TEXT );", [], this._binds['successHandler'], this._binds['updateError'] );

							var sortOptInsert = "INSERT INTO acctTrsnSortOptn( sortGroup, groupOrder, label, desc, qry, sortId ) VALUES( ?, ?, ?, ?, ?, ? );";

							transaction.executeSql( sortOptInsert, [ "Date", 0, "Oldest to Newest,<br />Show Newest", "Sorts transactions from oldest to newest. Displays the newest transactions.", "date ASC, itemId ASC", 0 ], this._binds['successHandler'], this._binds['updateError'] );
							transaction.executeSql( sortOptInsert, [ "Date", 0, "Newest to Oldest,<br />Show Newest", "Sorts transactions from newest to oldest. Displays the newest transactions.", "date DESC, itemId DESC", 1 ], this._binds['successHandler'], this._binds['updateError'] );
							transaction.executeSql( sortOptInsert, [ "Date", 0, "Oldest to Newest,<br />Show Oldest", "Sorts transactions from oldest to newest. Displays the oldest transactions.", "date ASC, itemId ASC", 8 ], this._binds['successHandler'], this._binds['updateError'] );

							transaction.executeSql( sortOptInsert, [ "Description", 1, "A-Z", "Sorts transactions from A to Z. Displays the newest transactions.", "desc COLLATE NOCASE ASC, itemId ASC", 2 ], this._binds['successHandler'], this._binds['updateError'] );
							transaction.executeSql( sortOptInsert, [ "Description", 1, "Z-A", "Sorts transactions from A to Z. Displays the newest transactions.", "desc COLLATE NOCASE DESC, itemId ASC", 3 ], this._binds['successHandler'], this._binds['updateError'] );

							transaction.executeSql( sortOptInsert, [ "Amount", 2, "Ascending", "Sorts transactions by amount, ascending. Displays the greatest expense.", "amount ASC, itemId ASC", 4 ], this._binds['successHandler'], this._binds['updateError'] );
							transaction.executeSql( sortOptInsert, [ "Amount", 2, "Descending", "Sorts transactions by amount, descending. Displays the greatest income.", "amount DESC, itemId ASC", 5 ], this._binds['successHandler'], this._binds['updateError'] );

							transaction.executeSql( sortOptInsert, [ "Status", 3, "Cleared first", "Sorts transactions by cleared status with Cleared transactions first. Transactions are then sorted by date from newest to oldest.", "cleared DESC, date ASC, itemId ASC", 6 ], this._binds['successHandler'], this._binds['updateError'] );
							transaction.executeSql( sortOptInsert, [ "Status", 3, "Pending first", "Sorts transactions by cleared status with Uncleared transactions first. Transactions are then sorted by date from newest to oldest.", "cleared ASC, date DESC, itemId ASC", 7 ], this._binds['successHandler'], this._binds['updateError'] );

							transaction.executeSql( sortOptInsert, [ "Check Number", 4, "Ascending Numbers", "Sorts transactions by check number. Displays the lowest numbered check first. Transactions without check numbers are sorted last.", "IFNULL( NULLIF( checkNum, '' ), ( SELECT IFNULL( MAX( checkNum ), 0 ) FROM expenses LIMIT 1 ) ) ASC, itemId ASC", 9 ], this._binds['successHandler'], this._binds['updateError'] );
							transaction.executeSql( sortOptInsert, [ "Check Number", 4, "Descending Numbers", "Sorts transactions by check number. Displays the highest numbered check first. Transactions without check numbers are sorted last.", "checkNum DESC, itemId ASC", 10 ], this._binds['successHandler'], this._binds['updateError'] );


							versionCheck = 15;
						case 15:
							var acctCatUpdate = "UPDATE accountCategories SET icon = ? WHERE icon = ?;";

							transaction.executeSql( acctCatUpdate, [ "cash_1.png", "cash.1.png" ], this._binds['successHandler'], this._binds['updateError'] );
							transaction.executeSql( acctCatUpdate, [ "cash_2.png", "cash.2.png" ], this._binds['successHandler'], this._binds['updateError'] );
							transaction.executeSql( acctCatUpdate, [ "cash_3.png", "cash.3.png" ], this._binds['successHandler'], this._binds['updateError'] );
							transaction.executeSql( acctCatUpdate, [ "cash_4.png", "cash.4.png" ], this._binds['successHandler'], this._binds['updateError'] );
							transaction.executeSql( acctCatUpdate, [ "cash_5.png", "cash.5.png" ], this._binds['successHandler'], this._binds['updateError'] );
							transaction.executeSql( acctCatUpdate, [ "checkbook_1.png", "checkbook.1.png" ], this._binds['successHandler'], this._binds['updateError'] );
							transaction.executeSql( acctCatUpdate, [ "checkbook_2.png", "checkbook.2.png" ], this._binds['successHandler'], this._binds['updateError'] );
							transaction.executeSql( acctCatUpdate, [ "coins_1.png", "coins.1.png" ], this._binds['successHandler'], this._binds['updateError'] );
							transaction.executeSql( acctCatUpdate, [ "coins_2.png", "coins.2.png" ], this._binds['successHandler'], this._binds['updateError'] );
							transaction.executeSql( acctCatUpdate, [ "coins_3.png", "coins.3.png" ], this._binds['successHandler'], this._binds['updateError'] );
							transaction.executeSql( acctCatUpdate, [ "coins_4.png", "coins.4.png" ], this._binds['successHandler'], this._binds['updateError'] );
							transaction.executeSql( acctCatUpdate, [ "credit_card_1.png", "credit_card.1.png" ], this._binds['successHandler'], this._binds['updateError'] );
							transaction.executeSql( acctCatUpdate, [ "credit_card_2.png", "credit_card.2.png" ], this._binds['successHandler'], this._binds['updateError'] );
							transaction.executeSql( acctCatUpdate, [ "credit_card_3.png", "credit_card.3.png" ], this._binds['successHandler'], this._binds['updateError'] );
							transaction.executeSql( acctCatUpdate, [ "dollar_sign_1.png", "dollar_sign.1.png" ], this._binds['successHandler'], this._binds['updateError'] );
							transaction.executeSql( acctCatUpdate, [ "dollar_sign_2.png", "dollar_sign.2.png" ], this._binds['successHandler'], this._binds['updateError'] );
							transaction.executeSql( acctCatUpdate, [ "dollar_sign_3.png", "dollar_sign.3.png" ], this._binds['successHandler'], this._binds['updateError'] );
							transaction.executeSql( acctCatUpdate, [ "future_transfer_1.png", "future_transfer.1.png" ], this._binds['successHandler'], this._binds['updateError'] );
							transaction.executeSql( acctCatUpdate, [ "icon_1.png", "icon.1.png" ], this._binds['successHandler'], this._binds['updateError'] );
							transaction.executeSql( acctCatUpdate, [ "icon_2.png", "icon.2.png" ], this._binds['successHandler'], this._binds['updateError'] );
							transaction.executeSql( acctCatUpdate, [ "icon_3.png", "icon.3.png" ], this._binds['successHandler'], this._binds['updateError'] );
							transaction.executeSql( acctCatUpdate, [ "icon_4.png", "icon.4.png" ], this._binds['successHandler'], this._binds['updateError'] );
							transaction.executeSql( acctCatUpdate, [ "jewel_1.png", "jewel.1.png" ], this._binds['successHandler'], this._binds['updateError'] );
							transaction.executeSql( acctCatUpdate, [ "jewel_2.png", "jewel.2.png" ], this._binds['successHandler'], this._binds['updateError'] );
							transaction.executeSql( acctCatUpdate, [ "money_bag_1.png", "money_bag.1.png" ], this._binds['successHandler'], this._binds['updateError'] );
							transaction.executeSql( acctCatUpdate, [ "money_bag_2.png", "money_bag.2.png" ], this._binds['successHandler'], this._binds['updateError'] );
							transaction.executeSql( acctCatUpdate, [ "money_bag_3.png", "money_bag.3.png" ], this._binds['successHandler'], this._binds['updateError'] );
							transaction.executeSql( acctCatUpdate, [ "money_bag_4.png", "money_bag.4.png" ], this._binds['successHandler'], this._binds['updateError'] );
							transaction.executeSql( acctCatUpdate, [ "padlock_1.png", "padlock.1.png" ], this._binds['successHandler'], this._binds['updateError'] );
							transaction.executeSql( acctCatUpdate, [ "padlock_2.png", "padlock.2.png" ], this._binds['successHandler'], this._binds['updateError'] );
							transaction.executeSql( acctCatUpdate, [ "safe_1.png", "safe.1.png" ], this._binds['successHandler'], this._binds['updateError'] );
							transaction.executeSql( acctCatUpdate, [ "safe_2.png", "safe.2.png" ], this._binds['successHandler'], this._binds['updateError'] );
							transaction.executeSql( acctCatUpdate, [ "transfer_1.png", "transfer.1.png" ], this._binds['successHandler'], this._binds['updateError'] );
							transaction.executeSql( acctCatUpdate, [ "transfer_2.png", "transfer.2.png" ], this._binds['successHandler'], this._binds['updateError'] );
							transaction.executeSql( acctCatUpdate, [ "transfer_3.png", "transfer.3.png" ], this._binds['successHandler'], this._binds['updateError'] );
							transaction.executeSql( acctCatUpdate, [ "transfer_4.png", "transfer.4.png" ], this._binds['successHandler'], this._binds['updateError'] );

							//OPTIONS: +1$, +remainder of dollar, none
							transaction.executeSql( "ALTER TABLE accounts ADD COLUMN auto_savings INTEGER NOT NULL DEFAULT 0;", [], this._binds['successHandler'], this._binds['updateError'] );
							transaction.executeSql( "ALTER TABLE accounts ADD COLUMN auto_savings_link INTEGER NOT NULL DEFAULT -1;", [], this._binds['successHandler'], this._binds['updateError'] );

							versionCheck = 16;
						case 16:
							transaction.executeSql( "ALTER TABLE expenses ADD COLUMN repeatUnlinked INTEGER NOT NULL DEFAULT 0;", [], this._binds['successHandler'], this._binds['updateError'] );

							versionCheck = 17;
						case 17:
							transaction.executeSql( "ALTER TABLE prefs ADD COLUMN errorReporting INTEGER NOT NULL DEFAULT 1;", [], this._binds['successHandler'], this._binds['updateError'] );
							transaction.executeSql( "ALTER TABLE expenses ADD COLUMN atSource INTEGER;", [], this._binds['successHandler'], this._binds['updateError'] );
							transaction.executeSql( "UPDATE accounts SET auto_savings_link = -1;", [], this._binds['successHandler'], this._binds['updateError'] );

							versionCheck = 18;
						case 18:
							//Rename table
							transaction.executeSql( "ALTER TABLE expenses RENAME TO transactions;", [], this._binds['successHandler'], this._binds['updateError'] );
							transaction.executeSql( "ALTER TABLE expenseCategories RENAME TO transactionCategories;", [], this._binds['successHandler'], this._binds['updateError'] );

							//Split Transaction System
							transaction.executeSql( "DROP TABLE IF EXISTS transactionSplit;", [], this._binds['successHandler'], this._binds['updateError'] );
							transaction.executeSql( "CREATE TABLE transactionSplit( transId INTEGER, genCat TEXT, specCat TEXT, amount REAL, last_sync TEXT );", [], this._binds['successHandler'], this._binds['updateError'] );

							//Add secondary trans cat to system
							transaction.executeSql( "ALTER TABLE transactions ADD COLUMN category2 INTEGER;", [], this._binds['successHandler'], this._binds['updateError'] );

							//Repeat System (ignore cleared, checknum)
							transaction.executeSql( "DROP TABLE IF EXISTS repeats;", [], this._binds['successHandler'], this._binds['updateError'] );
							transaction.executeSql( "CREATE TABLE repeats( repeatId INTEGER PRIMARY KEY ASC, frequency TEXT, daysOfWeek TEXT, itemSpan INTEGER, endingCondition TEXT, endDate TEXT, endCount INTEGER, currCout INTEGER, origDate TEXT, lastOccurance TEXT, last_sync TEXT, desc TEXT, amount REAL, note TEXT, category TEXT, acctId INTEGER, linkedAcctId INTEGER, autoTrsnLink INTEGER );", [], this._binds['successHandler'], this._binds['updateError'] );

							versionCheck = 19;
						case 19:
							transaction.executeSql( "ALTER TABLE prefs ADD COLUMN previewTransaction INTEGER;", [], this._binds['successHandler'], this._binds['updateError'] );

							versionCheck = 20;
						case 20:
							transaction.executeSql( "DELETE FROM budgets;", [], this._binds['successHandler'], this._binds['updateError'] );
							transaction.executeSql( "ALTER TABLE budgets ADD COLUMN category2 TEXT;", [], this._binds['successHandler'], this._binds['updateError'] );

							//Repeat System (ignore cleared, checknum)
							transaction.executeSql( "DROP TABLE IF EXISTS repeats;", [], this._binds['successHandler'], this._binds['updateError'] );
							transaction.executeSql( "CREATE TABLE repeats( repeatId INTEGER PRIMARY KEY ASC, frequency TEXT, daysOfWeek TEXT, itemSpan INTEGER, endingCondition TEXT, endDate TEXT, endCount INTEGER, currCout INTEGER, origDate TEXT, lastOccurance TEXT, last_sync TEXT, rep_desc TEXT, rep_amount REAL, rep_note TEXT, rep_category TEXT, rep_acctId INTEGER, rep_linkedAcctId INTEGER, rep_autoTrsnLink INTEGER );", [], this._binds['successHandler'], this._binds['updateError'] );

							versionCheck = 21;
						case 21:
							//versionCheck = 22;
					}

					if( do_final_stage === true ) {

						transaction.executeSql( "UPDATE prefs SET dbVer = ?;", [ versionCheck ], this.buildDBUpdate.bind( this ), this._binds['updateError'] );
					}
				}
			).bind( this ) );
	},

	update_encrypt_codes: function( step, spike, transaction, results ) {
		//var encrypted_string = Mojo.Model.encrypt( spike, input_string );
		//var decrypted_string = Mojo.Model.decrypt( spike, encrypted_string );

		this.updateLoadingSystem( true, $L( "Loading Checkbook" ), $L( "Encrypting systems" ) + "...", 0 );

		if( step === "account" ) {

			//Generate Spike
			var chars = ( '0123456789ABCDEFGHIJKLMNOPQRSTUVWXTZabcdefghiklmnopqrstuvwxyz' + ( new Date() ).getTime() ).split( '' );

			var spike_length = Math.floor( Math.random() * chars.length ) + 5;

			spike = '';
			for( var i = 0; i < spike_length; i++ ) {

				spike += chars[ Math.floor( Math.random() * chars.length ) ];
			}

			accountsDB.transaction(
				(
					function( transaction ) {

						for( var i = 0; i < results.rows.length; i++ ) {

							var row = results.rows.item( i );

							if( row['locedCode'] !== "" ) {

								transaction.executeSql( "UPDATE accounts SET lockedCode = ? WHERE acctId = ?;", [ Mojo.Model.encrypt( spike, row['lockedCode'] ), row['acctId'] ], this._binds['successHandler'], this._binds['updateError'] );
							}
						}

						transaction.executeSql( "UPDATE prefs SET spike = ?;", [ spike ], this._binds['successHandler'], this._binds['updateError'] );

						transaction.executeSql( "SELECT code, gSheetPass FROM prefs", [], this.update_encrypt_codes.bind( this, "app", spike ), this._binds['updateError'] );
					}
				).bind( this ) );
		} else if( step === "app" ) {

			accountsDB.transaction(
				(
					function( transaction ) {

						var row = results.rows.item( 0 );

						transaction.executeSql( "UPDATE prefs SET code = ?, gSheetPass = ?", [ Mojo.Model.encrypt( spike, row['code'] ), Mojo.Model.encrypt( spike, row['gSheetPass'] ) ], this.buildDBUpdate.bind( this ), this._binds['updateError'] );
					}
				).bind( this ) );
		} else {

			this.checkDBVersion();
			//I shouldn't be called... EVER!
		}
	},

	nduidCheck: function() {

		try {

			new Mojo.Service.Request(
					'palm://com.palm.preferences/systemProperties',
					{
						method: "Get",
						parameters: {
							"key": "com.palm.properties.nduid"
						},
						onSuccess: this.nduidCheckSuccess.bind( this )
					} );

		} catch( err ) {

			checkbookPrefs['nduid'] = "xxxxxxxxxx";
		}
	},

	nduidCheckSuccess: function( response ) {

		try {

			checkbookPrefs['nduid'] = response['com.palm.properties.nduid'];
		}catch( err ) {

			checkbookPrefs['nduid'] = "xxxxxxxxxx";
		}
	},

	launchMain: function() {

		this.updateProgressBar( 1 );

		/** BETA TRIAL CHECK **/
		if( Mojo.Controller.appInfo.title.toLowerCase().indexOf( "beta" ) >= 0 ) {

			var expiration = new Date( "December 31, 2012 23:59:59" ).getTime();
			var today = new Date().getTime();
			var daysLeft = Math.round( 10 * ( expiration - today ) / 86400000 ) / 10;

			if( daysLeft < 60 ) {

				Element.insert( document.body, new Element( 'div', { 'id': 'palm-disclaimer', 'class': 'fadedUltra' } ) );
			} else if( daysLeft < 45 && daysLeft >= 30 ) {

				Element.insert( document.body, new Element( 'div', { 'id': 'palm-disclaimer', 'class': 'fadedMega' } ) );
			} else if( daysLeft < 30 && daysLeft >= 15 ) {

				Element.insert( document.body, new Element( 'div', { 'id': 'palm-disclaimer', 'class': 'faded' } ) );
			} else if( daysLeft < 15 ) {

				Element.insert( document.body, new Element( 'div', { 'id': 'palm-disclaimer' } ) );
			}

			if( daysLeft < 30 && daysLeft >= 0 ) {

				Mojo.Controller.getAppController().showBanner( "Beta expires in " + daysLeft + " days.", "", "cbBeta" );
			} else if( daysLeft < 0 ) {

				Mojo.Controller.getAppController().showBanner( "Checkbook Beta has expired.", "", "cbBeta" );
				Mojo.Controller.getAppController().showBanner( "Please update to the paid version.", "", "cbBeta2" );
				this.controller.stageController.swapScene( "export-data" );
				return;
			}
		}

		checkbookPrefs['Metrix'].postDeviceData();

		if( checkbookPrefs['useCode'] === 1 ) {
			//Program Locked

			if( accounts_obj['defaultIndex'] >= 0 ) {
				//Default Account

				var dIndex = accounts_obj['defaultIndex'];

				if( accounts_obj['items'][dIndex]['locked'] == 1 ) {
					//Account Locked

					this.controller.stageController.swapScene( "login", "accounts", checkbookPrefs['code'], "close" );

					this.controller.stageController.pushScene( "login", { name: "transactions" }, accounts_obj['items'][dIndex]['lockedCode'], "back", accounts_obj['items'][dIndex]['rowId'] );
				} else {
					//Account Unlocked

					this.controller.stageController.swapScene( "accounts" );

					this.controller.stageController.pushScene( "login", { name: "transactions" }, checkbookPrefs['code'], "close", accounts_obj['items'][dIndex]['rowId'] );
				}
			} else {
				//No Default Account

				this.controller.stageController.swapScene( "login", "accounts", checkbookPrefs['code'], "close" );
			}
		} else {
			//Program Unlocked

			this.controller.stageController.swapScene( "accounts" );

			if( accounts_obj['defaultIndex'] >= 0 ) {

				var dIndex = accounts_obj['defaultIndex'];

				if( accounts_obj['items'][dIndex]['locked'] == 1 ) {
					//Account Locked

					this.controller.stageController.pushScene( "login", { name: "transactions" }, accounts_obj['items'][dIndex]['lockedCode'], "back", accounts_obj['items'][dIndex]['rowId'] );
				} else {
					//Account Unlocked

					this.controller.stageController.pushScene( { name: "transactions" }, accounts_obj['items'][dIndex]['rowId'] );
				}
			}
		}
	},

	buildDBUpdate: function( transaction, results ) {

		this.checkDBVersion();
	},

	checkDBVersionFailure: function( transaction, error ) {

		this.updateLoadingSystem( true, $L( "Loading Checkbook" ), $L( "Creating application database..." ), 0 );
		this.buildInitialDB();
	},

	checkDefaultAccountFailure: function( transaction, error ) {

		Mojo.Controller.getAppController().showBanner( $L( "Failure to get default account..." ), "", "cbError" );

		systemError( 'Splash Error: ' + error.message + ' (Code ' + error.code + ')' );
	},

	/***************************/
	/*     Create Database     */
	/***************************/
	buildInitialDB: function( transaction, results ) {

		this.firstRun = true;

		accountsDB.transaction(
			(
				function( transaction ) {
					/** remove next 2 after a few updates **/
					transaction.executeSql( "DROP TABLE IF EXISTS budget;", [], this._binds['successHandler'], this._binds['setupError'] );
					transaction.executeSql( "DROP TABLE IF EXISTS rules;", [], this._binds['successHandler'], this._binds['setupError'] );

					transaction.executeSql( "DROP TABLE IF EXISTS accounts;", [], this._binds['successHandler'], this._binds['setupError'] );
					transaction.executeSql( "DROP TABLE IF EXISTS accountCategories;", [], this._binds['successHandler'], this._binds['setupError'] );

					transaction.executeSql( "DROP TABLE IF EXISTS expenses;", [], this._binds['successHandler'], this._binds['setupError'] );
					transaction.executeSql( "DROP TABLE IF EXISTS expenseCategories;", [], this._binds['successHandler'], this._binds['setupError'] );

					transaction.executeSql( "DROP TABLE IF EXISTS repeats;", [], this._binds['successHandler'], this._binds['setupError'] );

					transaction.executeSql( "DROP TABLE IF EXISTS prefs;", [], this._binds['successHandler'], this._binds['setupError'] );

					transaction.executeSql( "CREATE TABLE accounts( acctId INTEGER UNIQUE PRIMARY KEY ASC, acctName TEXT, acctNotes TEXT, acctCategory TEXT, sort TEXT, defaultAccount INTEGER NOT NULL DEFAULT 0, frozen INTEGER NOT NULL DEFAULT 0, hidden INTEGER NOT NULL DEFAULT 0, acctLocked INTEGER NOT NULL DEFAULT 0, lockedCode TEXT, transDescMultiLine INTEGER NOT NULL DEFAULT 1, showTransTime INTEGER NOT NULL DEFAULT 1, useAutoComplete INTEGER NOT NULL DEFAULT 1, atmEntry INTEGER NOT NULL DEFAULT 0, bal_view INTEGER NOT NULL DEFAULT 0, runningBalance INTEGER NOT NULL DEFAULT 0, checkField INTEGER NOT NULL DEFAULT 0 );", [], this._binds['successHandler'], this._binds['setupError'] );

					transaction.executeSql( "CREATE TABLE accountCategories( name TEXT, catOrder INTEGER NOT NULL DEFAULT 0, icon TEXT );", [], this._binds['successHandler'], this._binds['setupError'] );

					transaction.executeSql( "CREATE TABLE expenses( itemId INTEGER UNIQUE PRIMARY KEY, desc TEXT, amount REAL, note TEXT, date TEXT, account INTEGER, category TEXT, linkedRecord INTEGER, linkedAccount INTEGER, cleared INTEGER NOT NULL DEFAULT 0, repeatId INTEGER, checkNum TEXT );", [], this._binds['successHandler'], this._binds['setupError'] );

					transaction.executeSql( "CREATE TABLE expenseCategories( catId INTEGER PRIMARY KEY ASC, genCat TEXT, specCat TEXT );", [], this._binds['successHandler'], this._binds['setupError'] );

					transaction.executeSql( "CREATE TABLE repeats( repeatId INTEGER PRIMARY KEY ASC, origionalRecord INTEGER, repeatInterval TEXT, dateEnd INTEGER, repeatTimes INTEGER, repeatCount INTEGER NOT NULL DEFAULT 0 );", [], this._binds['successHandler'], this._binds['setupError'] );

					transaction.executeSql( "CREATE TABLE prefs( dbVer INTEGER, useCode INTEGER, code TEXT, saveGSheetsData INTEGER, gSheetUser TEXT, gSheetPass TEXT, repeatUpdate TEXT );", [], this.buildInitialDBSuccess.bind( this ), this._binds['setupError'] );
				}
			).bind( this ) );
	},

	buildInitialDBSuccess: function( transaction, results ) {

		var buildInitialDBDefaultsPause = this.buildInitialDBDefaults.bind( this );

		buildInitialDBDefaultsPause.defer();
	},

	buildInitialDBDefaults: function() {

		accountsDB.transaction(
			(
				function( transaction ) {

					//Prefs
					transaction.executeSql( "INSERT INTO prefs( dbVer, useCode, saveGSheetsData ) VALUES( ?, ?, ? );", [ 5, 0, 0 ], this._binds['successHandler'], this._binds['setupError'] );

					//Add basic account categories
					var qryAccountCategories = "INSERT INTO accountCategories( name, catOrder, icon ) VALUES( ?, ?, ? );";

					transaction.executeSql( qryAccountCategories, [ $L( "Checking" ), 1, 'checkbook.1.png' ], this._binds['successHandler'], this._binds['setupError'] );
					transaction.executeSql( qryAccountCategories, [ $L( "Savings" ), 2, 'safe.1.png' ], this._binds['successHandler'], this._binds['setupError'] );
					transaction.executeSql( qryAccountCategories, [ $L( "Credit Card" ), 3, 'credit_card.3.png' ], this._binds['successHandler'], this._binds['setupError'] );
					transaction.executeSql( qryAccountCategories, [ $L( "Other" ), 4, 'coins.3.png' ], this._binds['successHandler'], this._binds['setupError'] );

					//Add basic expense categories
					var qryExpenseCategories = "INSERT INTO expenseCategories( genCat, specCat ) VALUES( ?, ? );";

					for( var i = 0; i < oriTransCat.length; i++ ) {

						transaction.executeSql( qryExpenseCategories, [ $L( oriTransCat[i]['genCat'] ), $L( oriTransCat[i]['specCat'] ) ], this._binds['successHandler'], this._binds['setupError'] );
					}

					this.checkDBVersion();
				}
			).bind( this ) );
	},

	/*********************/
	/* Default Functions */
	/*********************/
	qrySetupError: function( transaction, error ) {

		Mojo.Controller.getAppController().showBanner( $L( "Installation failed: " ) + error.message, "", "cbError" );

		systemError( 'Splash Installation Error: ' + error.message + ' (Code ' + error.code + ')' );

		this.closeApp();
	},

	qryUpdateError: function( transaction, error ) {

		Mojo.Controller.getAppController().showBanner( $L( "Update failed: " ) + error.message, "", "cbError" );

		systemError( 'Splash Update Error: ' + error.message + ' (Code ' + error.code + ')' );

		this.closeApp();
	},

	closeApp: function() {

		Mojo.Controller.getAppController().closeAllStages();
	},

	generalError: function( transaction, error ) {

		systemError( 'Splash Error: ' + error.message + ' (Code ' + error.code + ')' );
	},

	deactivate: function( event ) {
	},

	cleanup: function( event ) {
	}
} );
