/* Copyright 2009 and forward GlitchTech Science.  All rights reserved. */

var sqlModel = Class.create( {

	/** $super() Functions **/
	initialize: function() {
	},

	setup: function() {
	},

	ready: function() {
	},

	readytoactivate: function() {
	},

	activate: function() {
	},

	deactivate: function() {
	},

	cleanup: function() {
	},

	/** General SQL Handlers **/
	successHandler: function() {
		//Blank handler, for when success is good but doesn't matter
	},

	sqlError: function() {

		Mojo.Log.info( dump( arguments ) );

		var errorMessage = " || SQL Error: " + arguments[arguments.length - 1].message +
								" (Code " + arguments[arguments.length - 1].code + ")";

		for( var i = 0; i < arguments.length - 2; i++ ) {

			errorMessage += " || " + arguments[i];
		}

		systemError( errorMessage );

		//Callback function must be first
		if( arguments[0] && typeof( arguments[0] ) === "function" ) {

			arguments[0]();
		}
	},

	/** Account Queries **/
	loadAllAccounts: function( offset, limit, callbackFn ) {
		//callback functions must be sent like this.somefunction.bind( this );

		if( !offset || !limit || typeof( offset ) === "undefined" || typeof( limit ) === "undefined" || offset < 0 || limit <= 0 ) {

			offset = 0;
			limit = 25;
		}

		if( offset === 0 && accounts_obj['items_changed'] === true ) {

			accounts_obj['items'].clear();
			accounts_obj['popup'].clear();
		}

		if( !bal_view || typeof( bal_view ) === "undefined" || bal_view < 0 ) {

			bal_view = 4;
		}

		accountsDB.transaction(
			(
				function( transaction ) {

					var today = new Date();
					var now = Date.parse( today );
					today.setHours( 23, 59, 59, 999 );
					today = Date.parse( today );

					var accountQry = "SELECT *," +

						" ( SELECT qry FROM acctTrsnSortOptn WHERE sortId = accounts.sort ) AS sortQry," +
						" IFNULL( ( SELECT COUNT( transactions.amount ) FROM transactions WHERE transactions.account = accounts.acctId ), 0 ) AS itemCount," +//Row count

						" IFNULL( ( SELECT accountCategories.icon FROM accountCategories WHERE accountCategories.name = accounts.acctCategory ), '|-NOICON-|' ) AS acctCategoryIcon," +
						" ( SELECT accountCategories.color FROM accountCategories WHERE accountCategories.name = accounts.acctCategory ) AS acctCategoryColor," +
						" ( SELECT accountCategories.catOrder FROM accountCategories WHERE accountCategories.name = accounts.acctCategory ) AS acctCatOrder," +
						" ( SELECT accountCategories.rowid FROM accountCategories WHERE accountCategories.name = accounts.acctCategory ) AS acctCatId," +

						" IFNULL( ( SELECT SUM( transactions.amount ) FROM transactions WHERE transactions.account = accounts.acctId" +
							" AND (" +
								" ( CAST( transactions.date AS INTEGER ) <= ? AND showTransTime = 1 ) OR" +
								" ( CAST( transactions.date AS INTEGER ) <= ? AND showTransTime = 0 )" +
							" ) ), 0 ) AS balance0," +//bal_view = 0
						" IFNULL( ( SELECT SUM( transactions.amount ) FROM transactions WHERE transactions.account = accounts.acctId" +
							" AND (" +
								" ( CAST( transactions.date AS INTEGER ) <= ? AND showTransTime = 1 ) OR" +
								" ( CAST( transactions.date AS INTEGER ) <= ? AND showTransTime = 0 )" +
							" ) AND transactions.cleared = 1 ), 0 ) AS balance1," +//bal_view = 1
						" IFNULL( ( SELECT SUM( transactions.amount ) FROM transactions WHERE transactions.account = accounts.acctId" +
							" AND transactions.cleared = 0 ), 0 ) AS balance3," +//bal_view = 3
						" IFNULL( ( SELECT SUM( transactions.amount ) FROM transactions WHERE transactions.account = accounts.acctId ), 0 ) AS balance2" +//bal_view = 2

						" FROM accounts " +
						" ORDER BY " + accountSortOptionsModel['items'][checkbookPrefs['custom_sort']]['query'] + " LIMIT ? OFFSET ?;";

					transaction.executeSql(
							accountQry,
							[ now, today, now, today, limit, offset ],
							this.loadAllAccountsHandler.bind( this, offset, limit, callbackFn ),
							this.sqlError.bind( this, callbackFn, "Loading Accounts" )
					);
				}
			).bind( this ) );
	},

	loadAllAccountsHandler: function( offset, count, callbackFn, transaction, results ) {

		//insert accounts into global obj
		var balance = 0;

		var limit = results.rows.length;

		for( var i = 0; i < limit; i++ ) {

			var balance = 0;
			var row = results.rows.item( i );

			//Account Balance Work
			var currBalView = row['bal_view'];

			if( bal_view !== 4 ) {

				currBalView = parseInt( bal_view );
			}

			switch( currBalView ) {
				case 0:
					balance = row['balance0'];
					break;
				case 1:
					balance = row['balance1'];
					break;
				case 2:
					balance = row['balance2'];
					break;
				case 3:
					balance = row['balance3'];
					break;
				default:
					balance = 0;
			}

			var balanceColor = "neutralFunds";
			if( ( Math.round( balance * 100 ) / 100 ) > 0 ) {

				balanceColor = 'positiveFunds';
			} else if( ( Math.round( balance * 100 ) / 100 ) < 0 ) {

				balanceColor = 'negativeFunds';
			}

			//Remember default account
			if( row['defaultAccount'] == 1 ) {

				accounts_obj['defaultIndex'] = offset + i;
				accounts_obj['defaultIndex'] = offset + i;
			}

			//Build each account obj
			accounts_obj['items'][( offset + i )] = {
							index: ( offset + i ),

							rowId: row['acctId'],

							category: row['acctCategory'],
							categoryIcon: ( row['acctCategoryIcon'] === "|-NOICON-|" ? "icon_2.png" : row['acctCategoryIcon'] ),
							categoryColor: row['acctCategoryColor'],
							acctCatId: row['acctCatId'],
							acctCatOrder: row['acctCatOrder'],

							name: row['acctName'],
							description: row['acctNotes'],
							descriptionDisplay: formatNotes( row['acctNotes'] ),

							fontColor: balanceColor,

							sort: row['sort'],
							sortQry: row['sortQry'],
							itemCount: ( row['itemCount'] == "" ? 0 : row['itemCount'] ),

							sect_order: row['sect_order'],
							defaultAccount: row['defaultAccount'],

							frozen: row['frozen'],
							hidden: row['hidden'],
							dispAcct: ( row['hidden'] === 2 ? "display:none;" : "" ),
							hiddenColor: ( row['hidden'] === 0 ? "" : "blue" ),

							locked: row['acctLocked'],
							lockedDisplay: ( ( row['acctLocked'] == 1 ) ? 'acctLocked' : 'acctUnlocked' ),
							lockedCode: row['lockedCode'],

							atmEntry: row['atmEntry'],
							bal_view: row['bal_view'],
							checkField: row['checkField'],
							enableCategories: row['enableCategories'],
							hideNotes: row['hideNotes'],
							hide_cleared: row['hide_cleared'],
							runningBalance: row['runningBalance'],
							showTransTime: row['showTransTime'],
							transDescMultiLine: row['transDescMultiLine'],
							useAutoComplete: row['useAutoComplete'],
							autoSavings: row['auto_savings'],
							autoSavingsLink: row['auto_savings_link'],

							balance: formatAmount( parseFloat( balance ) ),
							balance0: row['balance0'],
							balance1: row['balance1'],
							balance2: row['balance2'],
							balance3: row['balance3'],
							balance4: balance,

							last_sync: row['last_sync']
						};

			//Build each account obj (for pop up menus)
			accounts_obj['popup'][( offset + i )] = {
							label: row['acctName'],
							iconPath: './images/' + ( row['acctCategoryIcon'] === "|-NOICON-|" ? "icon.2.png" : row['acctCategoryIcon'] ),
							color: row['acctCategoryColor'],
							command: row['acctId']
						};
		}

		if( limit < count ) {

			accounts_obj['items_changed'] = true;

			this.adjustOverallBalance( callbackFn );
		} else {

			this.loadAllAccounts( offset + count, count, callbackFn );
		}
	},

	reloadAccount: function( acctId, index, callbackFn ) {

		if( !bal_view || typeof( bal_view ) === "undefined" || bal_view < 0 ) {

			bal_view = 4;
		}

		accountsDB.transaction(
			(
				function( transaction ) {

					var today = new Date();
					var now = Date.parse( today );
					today.setHours( 23, 59, 59, 999 );
					today = Date.parse( today );

					var accountQry = "SELECT *," +

						" ( SELECT qry FROM acctTrsnSortOptn WHERE sortId = accounts.sort ) AS sortQry," +
						" IFNULL( ( SELECT COUNT( transactions.amount ) FROM transactions WHERE transactions.account = accounts.acctId ), 0 ) AS itemCount," +//Row count

						" IFNULL( ( SELECT accountCategories.icon FROM accountCategories WHERE accountCategories.name = accounts.acctCategory ), '|-NOICON-|' ) AS acctCategoryIcon," +
						" ( SELECT accountCategories.color FROM accountCategories WHERE accountCategories.name = accounts.acctCategory ) AS acctCategoryColor," +
						" ( SELECT accountCategories.catOrder FROM accountCategories WHERE accountCategories.name = accounts.acctCategory ) AS acctCatOrder," +
						" ( SELECT accountCategories.rowid FROM accountCategories WHERE accountCategories.name = accounts.acctCategory ) AS acctCatId," +

						" IFNULL( ( SELECT SUM( transactions.amount ) FROM transactions WHERE transactions.account = accounts.acctId" +
							" AND (" +
								" ( CAST( transactions.date AS INTEGER ) <= ? AND showTransTime = 1 ) OR" +
								" ( CAST( transactions.date AS INTEGER ) <= ? AND showTransTime = 0 )" +
							" ) ), 0 ) AS balance0," +//bal_view = 0
						" IFNULL( ( SELECT SUM( transactions.amount ) FROM transactions WHERE transactions.account = accounts.acctId" +
							" AND (" +
								" ( CAST( transactions.date AS INTEGER ) <= ? AND showTransTime = 1 ) OR" +
								" ( CAST( transactions.date AS INTEGER ) <= ? AND showTransTime = 0 )" +
							" ) AND transactions.cleared = 1 ), 0 ) AS balance1," +//bal_view = 1
						" IFNULL( ( SELECT SUM( transactions.amount ) FROM transactions WHERE transactions.account = accounts.acctId" +
							" AND transactions.cleared = 0 ), 0 ) AS balance3," +//bal_view = 3
						" IFNULL( ( SELECT SUM( transactions.amount ) FROM transactions WHERE transactions.account = accounts.acctId ), 0 ) AS balance2" +//bal_view = 2

						" FROM accounts WHERE acctId = ? LIMIT 1;";

					transaction.executeSql(
							accountQry,
							[ now, today, now, today, acctId ],
							this.reloadAccountHandler.bind( this, acctId, index, callbackFn ),
							this.sqlError.bind( this, callbackFn, "Loading Accounts" )
					);
				}
			).bind( this ) );
	},

	reloadAccountHandler: function( acctId, indexIn, callbackFn, transaction, results ) {

		//insert accounts into global obj
		var balance = 0;

		var row = results.rows.item( 0 );

		//Account Balance Work
		var currBalView = row['bal_view'];

		if( bal_view !== 4 ) {

			currBalView = parseInt( bal_view );
		}

		switch( currBalView ) {
			case 0:
				balance = row['balance0'];
				break;
			case 1:
				balance = row['balance1'];
				break;
			case 2:
				balance = row['balance2'];
				break;
			case 3:
				balance = row['balance3'];
				break;
			default:
				balance = 0;
		}

		var balanceColor = "neutralFunds";
		if( ( Math.round( balance * 100 ) / 100 ) > 0 ) {

			balanceColor = 'positiveFunds';
		} else if( ( Math.round( balance * 100 ) / 100 ) < 0 ) {

			balanceColor = 'negativeFunds';
		}

		//Remember default account
		if( row['defaultAccount'] == 1 ) {

			accounts_obj['defaultIndex'] = indexIn;
			accounts_obj['defaultIndex'] = indexIn;
		}

		//Build each account obj
		accounts_obj['items'][indexIn] = {
						index: indexIn,

						rowId: row['acctId'],

						category: row['acctCategory'],
						categoryIcon: ( row['acctCategoryIcon'] === "|-NOICON-|" ? "icon_2.png" : row['acctCategoryIcon'] ),
						categoryColor: row['acctCategoryColor'],
						acctCatId: row['acctCatId'],
						acctCatOrder: row['acctCatOrder'],

						name: row['acctName'],
						description: row['acctNotes'],
						descriptionDisplay: formatNotes( row['acctNotes'] ),

						fontColor: balanceColor,

						sort: row['sort'],
						sortQry: row['sortQry'],
						itemCount: row['itemCount'],

						sect_order: row['sect_order'],
						defaultAccount: row['defaultAccount'],

						frozen: row['frozen'],
						hidden: row['hidden'],
						dispAcct: ( row['hidden'] === 2 ? "display:none;" : "" ),
						hiddenColor: ( row['hidden'] === 0 ? "" : "blue" ),

						locked: row['acctLocked'],
						lockedDisplay: ( ( row['acctLocked'] == 1 ) ? 'acctLocked' : 'acctUnlocked' ),
						lockedCode: row['lockedCode'],

						atmEntry: row['atmEntry'],
						bal_view: row['bal_view'],
						checkField: row['checkField'],
						enableCategories: row['enableCategories'],
						hideNotes: row['hideNotes'],
						hide_cleared: row['hide_cleared'],
						runningBalance: row['runningBalance'],
						showTransTime: row['showTransTime'],
						transDescMultiLine: row['transDescMultiLine'],
						useAutoComplete: row['useAutoComplete'],
						autoSavings: row['auto_savings'],
						autoSavingsLink: row['auto_savings_link'],

						balance: formatAmount( parseFloat( balance ) ),
						balance0: row['balance0'],
						balance1: row['balance1'],
						balance2: row['balance2'],
						balance3: row['balance3'],
						balance4: balance,

						last_sync: row['last_sync']
					};

		//Build each account obj (for pop up menus)
		accounts_obj['popup'][indexIn] = {
						label: row['acctName'],
						iconPath: './images/' + ( row['acctCategoryIcon'] === "|-NOICON-|" ? "icon.2.png" : row['acctCategoryIcon'] ),
						color: row['acctCategoryColor'],
						command: row['acctId']
					};

		accounts_obj['items_changed'] = true;

		this.adjustOverallBalance( callbackFn );
	},

	/* Account Modification Queries */
	newAccount: function( name, desc, cat, sort, defaultAccount, frozen, hidden, locked, lockedCode, transDescMultiLine, showTransTime, useAutoComplete, atmEntry, autoSavings, autoSavingsLink,  balance, runningBalance, checkField, hideNotes, enableCategories, hideCleared, spike, callbackFn ) {

		if( locked == 1 && ( lockedCode == "" || !lockedCode ) ) {
			//No code, turn off setting

			locked = 0;
			lockedCode = "";
		} else if( locked == 0 ) {
			//Set to off, no code

			lockedCode = "";
		} else {
			//Set to on, code

			lockedCode = Mojo.Model.encrypt( spike, lockedCode );
		}

		if( autoSavings == 1 && ( autoSavingsLink < 0 || isNaN( autoSavingsLink ) ) ) {
			//No account linked

			autoSavings = 0;
			autoSavingsLink = -1;
		} else if( autoSavings == 0 ) {
			//Linking turned off

			autoSavingsLink = -1;
		}

		accountsDB.transaction( (
				function( transaction ) {

					if( defaultAccount === 1 ) {
						//set all others to 0

						transaction.executeSql( "UPDATE accounts SET defaultAccount = 0;", [] );
					}

					var qryAccountsUpdate = "INSERT INTO accounts ( acctName, acctNotes, acctCategory, sort, defaultAccount, frozen, hidden, acctLocked, lockedCode, transDescMultiLine, showTransTime, useAutoComplete, atmEntry, auto_savings, auto_savings_link, bal_view, runningBalance, checkField, hideNotes, enableCategories, hide_cleared, sect_order ) VALUES( ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ( SELECT IFNULL( MAX( sect_order ), 0 ) FROM accounts ) );"

					transaction.executeSql(
								qryAccountsUpdate,
								[
									name,
									desc,
									cat,
									sort,
									defaultAccount,
									frozen,
									hidden,
									locked,
									lockedCode,
									transDescMultiLine,
									showTransTime,
									useAutoComplete,
									atmEntry,
									autoSavings,
									autoSavingsLink,
									balance,
									runningBalance,
									checkField,
									hideNotes,
									enableCategories,
									hideCleared
								],
								this.newAccountHandler.bind( this, callbackFn ),
								this.sqlError.bind( this, callbackFn, "Creating new account" ) );
				}
			).bind( this ) );
	},

	editAccount: function( acctId, name, desc, cat, sort, defaultAccount, frozen, hidden, locked, lockedCode, transDescMultiLine, showTransTime, useAutoComplete, atmEntry, autoSavings, autoSavingsLink, balance, runningBalance, checkField, hideNotes, enableCategories, hideCleared, spike, pinSet, callbackFn ) {

		if( locked == 1 && ( lockedCode == "" || !lockedCode ) ) {
			//No code, turn off setting

			locked = 0;
			lockedCode = "";
		} else if( locked == 0 ) {
			//Set to off, no code

			lockedCode = "";
		} else {
			//Set to on, code

			if( !pinSet ) {

				lockedCode = Mojo.Model.encrypt( spike, lockedCode );
			}
		}

		if( autoSavings == 1 && ( autoSavingsLink < 0 || isNaN( autoSavingsLink ) ) ) {
			//No account linked

			autoSavings = 0;
			autoSavingsLink = -1;
		} else if( autoSavings == 0 ) {
			//Linking turned off

			autoSavingsLink = -1;
		}

		accountsDB.transaction(
			(
				function( transaction ) {

					if( defaultAccount === 1 ) {
						//set all others to 0

						transaction.executeSql( "UPDATE accounts SET defaultAccount = 0 WHERE acctId != ?;", [ parseInt( acctId ) ] );
					}

					var qryAccountsUpdate = "UPDATE accounts SET acctName = ?, acctNotes = ?, acctCategory = ?, sort = ?, defaultAccount = ?, frozen = ?, hidden = ?, acctLocked = ?, lockedCode = ?, transDescMultiLine = ?, showTransTime = ?, useAutoComplete = ?, atmEntry = ?, auto_savings = ?, auto_savings_link = ?, bal_view = ?, runningBalance = ?, checkField = ?, hideNotes = ?, enableCategories = ?, hide_cleared = ? WHERE acctId = ?;";

					transaction.executeSql(
								qryAccountsUpdate,
								[
									name,
									desc,
									cat,
									sort,
									defaultAccount,
									frozen,
									hidden,
									locked,
									lockedCode,
									transDescMultiLine,
									showTransTime,
									useAutoComplete,
									atmEntry,
									autoSavings,
									autoSavingsLink,
									balance,
									runningBalance,
									checkField,
									hideNotes,
									enableCategories,
									hideCleared,
									acctId
								],
								this.editAccountHandler.bind( this, callbackFn ),
								this.sqlError.bind( this, callbackFn, "Editing an account" ) );
				}
			).bind( this ) );
	},

	deleteAccount: function( index, callbackFn ) {
		//Functions only related to data. UI updates must take place in their home scene

		accountsDB.transaction(
			(
				function( transaction ) {

					var itemId = parseInt( accounts_obj['items'][index]['rowId'] );

					//Delete all transactions in the account
					transaction.executeSql( "DELETE FROM transactions WHERE account = ?;", [ itemId ], null, this.sqlError.bind( this, "Deleting account transactions" ) );

					//Change transfers linked to the account into transactions or income
					transaction.executeSql( "UPDATE transactions SET linkedAccount = '', linkedRecord = '' WHERE linkedAccount = ?;", [ itemId ], null, this.sqlError.bind( this, "Deleting account links" ) );

					//Delete all repeats that are linked to transactions in the account
					transaction.executeSql( "DELETE FROM repeats WHERE acctId = ? OR linkedAcctId = ?;", [ itemId, itemId ], null, this.sqlError.bind( this, "Deleting expense repeat" ) );

					//Delete account
					transaction.executeSql( "DELETE FROM accounts WHERE acctId = ?;", [ itemId ], this.deleteAccountUpdater.bind( this, callbackFn ), this.sqlError.bind( this, "Deleting account db object" ) );
				}
			).bind( this ) );
	},

	newAccountHandler: function( callbackFn, transaction, results ) {

		accounts_obj['items_changed'] = true;

		//Use SQL to sort this item into the rest
		this.loadAllAccounts( 0, 25, callbackFn );
	},

	editAccountHandler: function( callbackFn, transaction, results ) {

		accounts_obj['items_changed'] = true;

		//Use SQL to sort this item into the rest
		this.loadAllAccounts( 0, 25, callbackFn );
	},

	deleteAccountUpdater: function( callbackFn, transaction, results ) {

		accounts_obj['items_changed'] = true;

		//Use SQL to sort this item into the rest
		this.loadAllAccounts( 0, 25, callbackFn );
	},

	updateDefaultAccount: function( acctId, callbackFn ) {

		accountsDB.transaction(
			(
				function( transaction ) {

					if( acctId >= 0 ) {

						transaction.executeSql("UPDATE accounts SET defaultAccount = 0 WHERE acctId != ?;", [ parseInt( acctId ) ], null, this.sqlError.bind( this ));

						transaction.executeSql("UPDATE accounts SET defaultAccount = 1 WHERE acctId = ?;", [ parseInt( acctId ) ], this.updateDefaultAccountHandler.bind( this, callbackFn ), this.sqlError.bind( this ));
					} else {

						accounts_obj['defaultIndex'] = -1;

						transaction.executeSql( "UPDATE accounts SET defaultAccount = 0 WHERE defaultAccount != 0;", [], this.updateDefaultAccountHandler.bind( this, callbackFn ), this.sqlError.bind( this ) );
					}
				}
			).bind( this ) );
	},

	updateDefaultAccountHandler: function( callbackFn, transaction, results ) {

		accounts_obj['items_changed'] = true;

		//Use SQL to sort this item into the rest
		this.loadAllAccounts( 0, 25, callbackFn );
	},

	zeroOverallBalance: function() {

			accounts_obj['totalBalance'] = [ 0, 0, 0, 0, 0 ];
	},

	adjustOverallBalance: function( callbackFn ) {

		accountsDB.transaction(
			(
				function( transaction ) {

					var today = new Date();
					var now = Date.parse( today );
					today.setHours( 23, 59, 59, 999 );
					today = Date.parse( today );

					var balanceQry = "SELECT " +
							"SUM( IFNULL( ( SELECT SUM( transactions.amount ) FROM transactions WHERE transactions.account = accounts.acctId AND ( ( CAST( transactions.date AS INTEGER ) <= ? AND showTransTime = 1 ) OR ( CAST( transactions.date AS INTEGER ) <= ? AND showTransTime = 0 ) ) ), 0 ) ) AS balance0, " +

							"SUM( IFNULL( ( SELECT SUM( transactions.amount ) FROM transactions WHERE transactions.account = accounts.acctId AND ( ( CAST( transactions.date AS INTEGER ) <= ? AND showTransTime = 1 ) OR ( CAST( transactions.date AS INTEGER ) <= ? AND showTransTime = 0 ) ) AND transactions.cleared = 1 ), 0 ) ) AS balance1, " +

							"SUM( IFNULL( ( SELECT SUM( transactions.amount ) FROM transactions WHERE transactions.account = accounts.acctId ), 0 ) ) AS balance2, " +

							"SUM( IFNULL( ( SELECT SUM( transactions.amount ) FROM transactions WHERE transactions.account = accounts.acctId AND transactions.cleared = 0 ), 0 ) ) AS balance3, " +

							"SUM( " +
								"CASE " +
									"WHEN bal_view = 0 THEN IFNULL( ( SELECT SUM( transactions.amount ) FROM transactions WHERE transactions.account = accounts.acctId AND ( ( CAST( transactions.date AS INTEGER ) <= ? AND showTransTime = 1 ) OR ( CAST( transactions.date AS INTEGER ) <= ? AND showTransTime = 0 ) ) ), 0 ) " +

									"WHEN bal_view = 1 THEN IFNULL( ( SELECT SUM( transactions.amount ) FROM transactions WHERE transactions.account = accounts.acctId AND ( ( CAST( transactions.date AS INTEGER ) <= ? AND showTransTime = 1 ) OR ( CAST( transactions.date AS INTEGER ) <= ? AND showTransTime = 0 ) ) AND transactions.cleared = 1 ), 0 ) " +

									"WHEN bal_view = 2 THEN IFNULL( ( SELECT SUM( transactions.amount ) FROM transactions WHERE transactions.account = accounts.acctId ), 0 ) " +

									"WHEN bal_view = 3 THEN IFNULL( ( SELECT SUM( transactions.amount ) FROM transactions WHERE transactions.account = accounts.acctId AND transactions.cleared = 0 ), 0 ) " +

									"ELSE 0 " +
								"END " +
							") AS stdBal " +

						"FROM accounts " +
						"WHERE hidden = 0";

					transaction.executeSql(
							balanceQry,
							[ now, today, now, today, now, today, now, today ],
							this.adjustOverallBalanceHandler.bind( this, callbackFn ),
							this.sqlError.bind( this, callbackFn, "Loading Accounts" )
					);
				}
			).bind( this ) );
	},

	adjustOverallBalanceHandler: function( callbackFn, transaction, results ) {

		if( results.rows.length <= 0 ) {

			this.zeroOverallBalance();
		} else {

			var row = results.rows.item( 0 );

			accounts_obj['totalBalance'][0] = row['balance0'];
			accounts_obj['totalBalance'][1] = row['balance1'];
			accounts_obj['totalBalance'][2] = row['balance2'];
			accounts_obj['totalBalance'][3] = row['balance3'];
			accounts_obj['totalBalance'][4] = row['stdBal'];
		}

		if( callbackFn && typeof( callbackFn ) === "function" ) {

			callbackFn();
		}
	},

	/* Other Account Functions */
	getAccountById: function( acctId, callbackFn ) {

		//would love to do this via SQLite, but have to figure out who to select until record with id is found and get that count

		this.getAccountByIdHandler( acctId, callbackFn, 0, 50 );
	},

	getAccountByIdHandler: function( acctId, callbackFn, start, end ) {

		if( start >= accounts_obj['items'].length ) {

			//id not found
			callbackFn( -1 );
			return;
		}

		if( end > accounts_obj['items'].length ) {

			end = accounts_obj['items'].length;
		}

		var found = false;//redundancy
		var i = start;

		while( i < end && found === false ) {

			if( accounts_obj['items'][i]['rowId'] == acctId ) {

				found = true;
			} else {

				i++;
			}
		}

		if( !found ) {

			var tmpFn = this.getAccountByIdHandler.bind( this, acctId, callbackFn, end, ( end + ( end - start ) ) );
			tmpFn.defer();
		} else {

			callbackFn( i );
		}
	},

	getAccountCategoryData: function( index, callbackFn ) {

		accountsDB.transaction(
			(
				function( transaction ) {

					var accountQry = "SELECT IFNULL( ( SELECT accountCategories.icon FROM accountCategories WHERE accountCategories.name = accounts.acctCategory ), '|-NOICON-|' ) AS acctCategoryIcon," +
						" ( SELECT accountCategories.catOrder FROM accountCategories WHERE accountCategories.name = accounts.acctCategory ) AS acctCatOrder," +
						" ( SELECT accountCategories.rowid FROM accountCategories WHERE accountCategories.name = accounts.acctCategory ) AS acctCatId" +
						" FROM accounts " +
						" WHERE acctId = ? LIMIT 1;";

					var acctId = accounts_obj['items'][index]['rowId'];

					transaction.executeSql(
							accountQry,
							[ acctId ],
							this.getAccountCategoryDataHandler.bind( this, index, callbackFn ),
							this.sqlError.bind( this, callbackFn, "Loading account category information" )
					);
				}
			).bind( this ) );
	},

	getAccountCategoryDataHandler: function( index, callbackFn, transaction, results ) {

		if( results.rows.length > 0 ) {

			var row = results.rows.item( 0 );

			accounts_obj['items'][index]['categoryIcon'] = ( row['acctCategoryIcon'] === "|-NOICON-|" ? "icon.2.png" : row['acctCategoryIcon'] );
			accounts_obj['items'][index]['acctCatId'] = row['acctCatId'];
			accounts_obj['items'][index]['acctCatOrder'] = row['acctCatOrder'];
		}

		if( callbackFn && typeof( callbackFn ) === "function" ) {

			callbackFn();
		}
	},

	getAccountName: function( acctId ) {

		for( var i = 0; i < accounts_obj['items'].length; i++ ) {

			if( accounts_obj['items'][i]['rowId'] == acctId ) {

				return( cleanString( accounts_obj['items'][i]['name'] ) );
			}
		}

		return "";
	},

	getAccountColor: function( acctId ) {

		for( var i = 0; i < accounts_obj['items'].length; i++ ) {

			if( accounts_obj['items'][i]['rowId'] == acctId ) {

				return( accounts_obj['items'][i]['categoryColor'] );
			}
		}

		return "";
	},

	getAccountImage: function( acctId ) {

		for( var i = 0; i < accounts_obj['items'].length; i++ ) {

			if( accounts_obj['items'][i]['rowId'] == acctId ) {

				return( "<img src='./images/" + accounts_obj['items'][i]['categoryIcon'] + "' class='dropdown-image' />" );
			}
		}

		return "";
	},

	/** Transaction Functions **/
	addTransaction: function( transId, desc, amount, cleared, note, dateTime, acctId, category, linkedAcctId, repeatId, checkNum, autoTrsn, autoTrsnLink, callbackFn ) {

		accountsDB.transaction(
			(
				function( transaction ) {

					var qryInsertTransaction = "INSERT INTO transactions( itemId, desc, amount, cleared, note, date, account, category, category2, linkedRecord, linkedAccount, repeatId, repeatUnlinked, checkNum ) VALUES( ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ? );";

					var catBack = this.handleSplitTransactionInsert( category, transId, ( ( linkedAcctId && !isNaN( linkedAcctId ) && linkedAcctId !== "" && linkedAcctId >= 0 ) ? ( transId + 1 ) : null ), transaction );

					if( linkedAcctId && !isNaN( linkedAcctId ) && linkedAcctId !== "" && linkedAcctId >= 0 ) {
						//Transfer

						transaction.executeSql(
								qryInsertTransaction,
								[
									transId,
									desc,
									-amount,
									( cleared ? "1" : "0" ),
									note,
									dateTime,
									acctId,
									catBack['category'],
									catBack['category2'],
									( transId + 1 ),
									linkedAcctId,
									repeatId,
									0,
									checkNum
								],
								null,
								this.sqlError.bind( this, callbackFn, "insert source transfer", qryInsertTransaction )
							);

						transaction.executeSql(
								qryInsertTransaction,
								[
									( transId + 1 ),
									desc,
									amount,
									( cleared ? "1" : "0" ),
									note,
									dateTime,
									linkedAcctId,
									catBack['category'],
									catBack['category2'],
									transId,
									acctId,
									repeatId,
									0,
									checkNum
								],
								this.addAutoTransferTransaction.bind( this, transId, ( transId + 2 ), desc, amount, cleared, note, dateTime, acctId, category, linkedAcctId, repeatId, checkNum, autoTrsn, autoTrsnLink, callbackFn ),
								this.sqlError.bind( this, callbackFn, "insert dest transfer", qryInsertTransaction )
							);
					} else {
						//Income or Expense

						transaction.executeSql(
								qryInsertTransaction,
								[
									transId,
									desc,
									amount,
									( cleared ? "1" : "0" ),
									note,
									dateTime,
									acctId,
									catBack['category'],
									catBack['category2'],
									null,
									null,
									repeatId,
									0,
									checkNum
								],
								this.addAutoTransferTransaction.bind( this, transId, ( transId + 1 ), desc, amount, cleared, note, dateTime, acctId, category, null, repeatId, checkNum, autoTrsn, autoTrsnLink, callbackFn ),
								this.sqlError.bind( this, callbackFn, "insert transaction", qryInsertTransaction )
							);
					}
				}
			).bind( this ) );
	},

	addAutoTransferTransaction: function( atSource, atTrsnId, desc, amount, cleared, note, dateTime, acctId, category, linkedAcctId, repeatId, checkNum, autoTrsn, autoTrsnLink, callbackFn, trsn, rslt ) {

		if( amount >= 0 ) {

			amount = Math.round( Math.ceil( amount ) * 100 - amount * 100 ) / 100;
		} else {

			amount = Math.round( Math.floor( amount ) * 100 - amount * 100 ) / 100;
		}

		if( autoTrsn <= 0 || isNaN( autoTrsnLink ) || autoTrsnLink < 0 || amount === 0 ) {

			this.transactionChangeHandler( acctId, linkedAcctId, callbackFn, null, null );
		} else {

			accountsDB.transaction(
				(
					function( transaction ) {

						var qryInsertTransaction = "INSERT INTO transactions( itemId, desc, amount, cleared, note, date, account, category, category2, linkedRecord, linkedAccount, repeatId, repeatUnlinked, checkNum, atSource ) VALUES( ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ? );";

						transaction.executeSql(
								qryInsertTransaction,
								[
									atTrsnId,
									$L( "Auto Transfer" ),
									amount,
									( cleared ? "1" : "0" ),
									desc,
									dateTime,
									acctId,
									$L( "Transfer" ),
									$L( "Auto Transfer" ),
									( atTrsnId + 1 ),
									autoTrsnLink,
									repeatId,
									0,
									checkNum,
									atSource
								],
								null,
								this.sqlError.bind( this, callbackFn, "insert source at", qryInsertTransaction )
							);

						transaction.executeSql(
								qryInsertTransaction,
								[
									( atTrsnId + 1 ),
									$L( "Auto Transfer" ),
									-amount,
									( cleared ? "1" : "0" ),
									desc,
									dateTime,
									autoTrsnLink,
									$L( "Transfer" ),
									$L( "Auto Transfer" ),
									atTrsnId,
									acctId,
									repeatId,
									0,
									checkNum,
									atSource
								],
								this.transactionChangeHandler.bind( this, acctId, linkedAcctId, callbackFn ),
								this.sqlError.bind( this, callbackFn, "insert dest at", qryInsertTransaction )
							);
					}
				).bind( this ) );
		}
	},

	editTransaction: function( desc, amount, cleared, note, dateTime, acctId, category, linkTransId, linkedAcctId, repeatId, repeatUnlinked, checkNum, transId, callbackFn ) {

		accountsDB.transaction(
			(
				function( transaction ) {

					if( linkedAcctId && !isNaN( linkedAcctId ) && linkedAcctId !== "" && linkedAcctId >= 0 ) {

						var catBack = this.handleSplitTransactionInsert( category, transId, linkTransId, transaction );

						var qryUpdateOne = "UPDATE transactions SET desc = ?, amount = ?, cleared = ?, note = ?, date = ?, account = ?, category = ?, category2 = ?, linkedRecord = ?, linkedAccount = ?, repeatId = ?, repeatUnlinked = ?, checkNum = ? WHERE itemId = ?;";
						var qryUpdateTwo = "UPDATE transactions SET desc = ?, amount = ?, note = ?, date = ?, account = ?, category = ?, category2 = ?, itemId = ?, linkedAccount = ?, repeatId = ?, repeatUnlinked = ?, checkNum = ? WHERE linkedRecord = ?;";

						transaction.executeSql(
								qryUpdateOne,
								[
									desc,
									-amount,
									( cleared ? "1" : "0" ),
									note,
									dateTime,
									acctId,
									catBack['category'],
									catBack['category2'],
									linkTransId,
									linkedAcctId,
									repeatId,
									repeatUnlinked,
									checkNum,
									transId
								],
								null,
								this.sqlError.bind( this, callbackFn, "update source transfer", qryUpdateOne )
							);

						transaction.executeSql(
								qryUpdateTwo,
								[
									desc,
									amount,
									note,
									dateTime,
									linkedAcctId,
									catBack['category'],
									catBack['category2'],
									linkTransId,
									acctId,
									repeatId,
									repeatUnlinked,
									checkNum,
									transId
								],
								null,
								this.sqlError.bind( this, callbackFn, "update dest transfer", qryUpdateTwo )
							);

						transaction.executeSql(
								"SELECT cleared FROM transactions WHERE linkedRecord = ?;",
								[ transId ],
								this.transactionChangeHandler.bind( this, acctId, linkedAcctId, callbackFn ),
								this.sqlError.bind( this, callbackFn, "update dest transfer", qryUpdateTwo )
							);
					} else {

						var catBack = this.handleSplitTransactionInsert( category, transId, null, transaction );

						var qryUpdateSingle = "UPDATE transactions SET desc = ?, amount = ?, cleared = ?, note = ?, date = ?, account = ?, category = ?, category2 = ?, linkedRecord = ?, linkedAccount = ?, repeatId = ?, repeatUnlinked = ?, checkNum = ? WHERE itemId = ?;";

						transaction.executeSql(
								qryUpdateSingle,
								[
									desc,
									amount,
									( cleared ? "1" : "0" ),
									note,
									dateTime,
									acctId,
									catBack['category'],
									catBack['category2'],
									null,
									null,
									repeatId,
									repeatUnlinked,
									checkNum,
									transId
								],
								this.transactionChangeHandler.bind( this, acctId, null, callbackFn ),
								this.sqlError.bind( this, callbackFn, "update transaction", qryUpdateSingle )
							);
					}
				}
			).bind( this ) );
	},

	deleteTransaction: function( trsnId, acctId, linkedAcctId, callbackFn ) {

		var qryDeleteTransaction = 'DELETE FROM transactions WHERE itemId = ? OR linkedRecord = ?;';

		accountsDB.transaction(
			(
				function( transaction ) {

					this.handleSplitTransactionDelete( trsnId, transaction );

					transaction.executeSql(
							qryDeleteTransaction,
							[ trsnId, trsnId ],
							this.transactionChangeHandler.bind( this, acctId, linkedAcctId, callbackFn ),
							this.sqlError.bind( this, "delete transaction", qryDeleteTransaction )
						);
				}
			).bind( this ) );
	},

	transactionChangeHandler: function( acctId, linkedAcctId, callbackFn, transaction, results ) {

		if( linkedAcctId && linkedAcctId !== "" && !isNaN( linkedAcctId ) && linkedAcctId >= 0 ) {

			this.getAccountById( acctId, this.updateAccountBalance.bind( this, acctId, null ) );//Source
			this.getAccountById( linkedAcctId, this.updateAccountBalance.bind( this, linkedAcctId, callbackFn ) );//Linked
		} else {

			this.getAccountById( acctId, this.updateAccountBalance.bind( this, acctId, callbackFn ) );//Single Account
		}
	},

	updateAccountBalance: function( acctId, callbackFn, acctIndex ) {

		if( acctId < 0 || acctIndex < 0 ) {
			//Invalid account id

			this.loadAllAccounts( 0, 25, callbackFn );
			return;
		}

		accountsDB.transaction(
			(
				function( transaction ) {

					var today = new Date();
					var now = Date.parse( today );
					today.setHours( 23, 59, 59, 999 );
					today = Date.parse( today );

					var accountQry = "SELECT bal_view," +

						" IFNULL( ( SELECT SUM( transactions.amount ) FROM transactions WHERE transactions.account = accounts.acctId" +
							" AND (" +
								" ( CAST( transactions.date AS INTEGER ) <= ? AND showTransTime = 1 ) OR" +
								" ( CAST( transactions.date AS INTEGER ) <= ? AND showTransTime = 0 )" +
							" ) ), 0 ) AS balance0," +//bal_view = 0

						" IFNULL( ( SELECT SUM( transactions.amount ) FROM transactions WHERE transactions.account = accounts.acctId" +
							" AND (" +
								" ( CAST( transactions.date AS INTEGER ) <= ? AND showTransTime = 1 ) OR" +
								" ( CAST( transactions.date AS INTEGER ) <= ? AND showTransTime = 0 )" +
							" ) AND transactions.cleared = 1 ), 0 ) AS balance1," +//bal_view = 1

						" IFNULL( ( SELECT SUM( transactions.amount ) FROM transactions WHERE transactions.account = accounts.acctId" +
							" AND transactions.cleared = 0 ), 0 ) AS balance3," +//bal_view = 3

						" IFNULL( ( SELECT SUM( transactions.amount ) FROM transactions WHERE transactions.account = accounts.acctId ), 0 ) AS balance2" +//bal_view = 2

						" FROM accounts " +
						" WHERE acctId = ? LIMIT 1;";

					transaction.executeSql(
							accountQry,
							[ now, today, now, today, acctId ],
							this.updateAccountBalanceHandler.bind( this, acctId, acctIndex, callbackFn ),
							this.sqlError.bind( this, callbackFn, "Loading Accounts" )
					);
				}
			).bind( this ) );
	},

	updateAccountBalanceHandler: function( acctId, acctIndex, callbackFn, transaction, results ) {

		var balance = 0;
		var row = results.rows.item( 0 );

		//Account Balance Work
		var currBalView = row['bal_view'];

		if( bal_view !== 4 ) {

			currBalView = parseInt( bal_view );
		}

		switch( currBalView ) {
			case 0:
				balance = row['balance0'];
				break;
			case 1:
				balance = row['balance1'];
				break;
			case 2:
				balance = row['balance2'];
				break;
			case 3:
				balance = row['balance3'];
				break;
			default:
				balance = currBalView;
		}

		var balanceColor = "neutralFunds";
		if( ( Math.round( balance * 100 ) / 100 ) > 0 ) {

			balanceColor = 'positiveFunds';
		} else if( ( Math.round( balance * 100 ) / 100 ) < 0 ) {

			balanceColor = 'negativeFunds';
		}

		//Update account balances
		accounts_obj['items'][acctIndex]['fontColor'] = balanceColor;
		accounts_obj['items'][acctIndex]['balance'] = formatAmount( parseFloat( balance ) );
		accounts_obj['items'][acctIndex]['balance0'] = row['balance0'];
		accounts_obj['items'][acctIndex]['balance1'] = row['balance1'];
		accounts_obj['items'][acctIndex]['balance2'] = row['balance2'];
		accounts_obj['items'][acctIndex]['balance3'] = row['balance3'];
		accounts_obj['items'][acctIndex]['balance4'] = balance;

		accounts_obj['items_changed'] = true;

		this.adjustOverallBalance( callbackFn );
	},

	/**
	 * handleSplitTransactionDelete - Deletes all transaction category items related to item id
	 * @param	int			transId
	 * @param	int			linkTransId
	 * @param	transaction	DB linkage for this run
	 */
	handleSplitTransactionDelete: function( transId, transaction ) {

		var qryDelete = "DELETE FROM transactionSplit WHERE transId = ? OR transId = ( SELECT itemId FROM transactions WHERE linkedRecord =? )";
		var qryArgs = [ transId, transId ];

		transaction.executeSql(
				qryDelete,
				qryArgs,
				null,
				this.sqlError.bind( this, "delete split category", qryDelete )
			);
	},

	/**
	 * handleSplitTransactionInsert
	 * @param	array[obj]	category contains all category information to process
	 * @param	int			transId
	 * @param	int			linkTransId
	 * @param	transaction	DB linkage for this run
	 */
	handleSplitTransactionInsert: function( category, transId, linkTransId, transaction ) {

		this.handleSplitTransactionDelete( transId, transaction );

		//Insert new split data
		var cat, cat2;

		if( category.length > 1 ) {
			//Split category

			cat = "||~SPLIT~||";
			cat2 = "";

			//if linked, amount is neg in source

			var qrySplitInsert = "INSERT INTO transactionSplit( genCat, specCat, amount, transId ) VALUES( ?, ?, ?, ? );";

			for( var i = 0; i < category.length; i++ ) {

				if( category[i]['amount'] === "" || isNaN( category[i]['amount'] ) ) {
					//Skip row

					continue;
				}

				//insert split transaction categories
				if( !linkTransId || isNaN( linkTransId ) ) {

					transaction.executeSql(
							qrySplitInsert,
							[
								category[i]['category'],
								category[i]['category2'],
								category[i]['amount'],
								transId
							],
							null,
							this.sqlError.bind( this, "insert split category (single)", qrySplitInsert )
						);
				} else {

					transaction.executeSql(
							qrySplitInsert,
							[
								category[i]['category'],
								category[i]['category2'],
								-category[i]['amount'],
								transId
							],
							null,
							this.sqlError.bind( this, "insert split category (linked source)", qrySplitInsert )
						);

					transaction.executeSql(
							qrySplitInsert,
							[
								category[i]['category'],
								category[i]['category2'],
								category[i]['amount'],
								linkTransId
							],
							null,
							this.sqlError.bind( this, "insert split category (linked destination)", qrySplitInsert )
						);
				}
			}
		} else if( category.length === 1 ) {
			//Single category

			cat = category[0]['category'];
			cat2 = category[0]['category2'];
		} else {

			cat = $L( "Uncategorized" );
			cat2 = $L( "Other" );
		}

		return { 'category': cat, 'category2': cat2 };
	}
} );
