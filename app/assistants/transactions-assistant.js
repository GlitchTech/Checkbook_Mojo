/* Copyright 2009 and forward GlitchTech Science. All rights reserved. */

var TransactionsAssistant = Class.create( searchModel, {

	initialize: function( $super, acctId, indexIn ) {

		$super();

		Mojo.Log.info( "TransactionsAssistant -> initialize()" );

		this.accountId = acctId;
		this.accountIndex = indexIn;

		this.currSort = "";
		this.resetScroll = true;

		this._binds = {
				//Event Binds
				'delete': this.transactionDeleteHandler.bindAsEventListener( this ),
				'tap': this.transactionTapHandler.bindAsEventListener( this ),
				'listHold': this.listHoldHandler.bindAsEventListener( this ),

				'balanceTapped': this.tHeaderBalanceTapped.bindAsEventListener( this ),
				'accountTapped': this.accountSelectorTapped.bindAsEventListener( this ),

				'metaTapUp': this.metatapUpHandler.bindAsEventListener( this ),
				'metaTapDown': this.metatapDownHandler.bindAsEventListener( this )
			};

		this.itemEdited = true;
	},

	setup: function() {

		Mojo.Log.info( "TransactionsAssistant -> setup()" );

		//False model data
		this.transactionListModel = {
			items: []
		};

		//Prepare attribute data
		this.dataAttr = {
			renderLimit: 30,
			lookahead: 15,
			itemsCallback: this.transactionListCallback.bind( this ),

			itemTemplate: 'transactions/transactionItemTemplate',
			nullItemTemplate: 'models/pendingItemTemplate',
			emptyTemplate: 'transactions/transactionSimpleGuide',

			hasNoWidgets: true,
			swipeToDelete: true,
			autoconfirmDelete: false,
			reorderable: false
		};

		this.controller.setupWidget( 'transactionList', this.dataAttr, this.transactionListModel );

		this.setupJustTypeSystem( 'transactionList', this.accountId );

		/** Control Buttons **/
		this.sortOptionsModel = {
				items: []
			};

		this.controller.setupWidget( 'sort-sub-menu', null, this.sortOptionsModel );

		this.searchSubMenuModel = appMenuFeatures;

		this.controller.setupWidget( 'search-sub-menu', null, this.searchSubMenuModel );

		var transactionCmdButtons = {
										visible: true,
										items: [
											{
												icon:'sort',
												submenu:'sort-sub-menu'
											}, {
												items: [
													{
														icon:'income',
														command:'income'
													}, {
														icon:'transfer',
														command:'transfer'
													}, {
														icon:'expense',
														command:'expense'
													}
												]
											}, {
												icon:'search',
												submenu:'search-sub-menu'
											}
										]
									};

		this.controller.setupWidget( Mojo.Menu.commandMenu, {}, transactionCmdButtons );

		this.transactionScreenMenuModel = {
							visible: true,
							items: [
								Mojo.Menu.editItem,
								appMenuPrefAccounts,
								{
									label: $L( "Transactions" ),
									items: [
										{
										//	label: $L( "Hide Cleared" ),
										//	command: "showhide"
										//}, {
											label: $L( "Purge" ),
											command: "purge"
										}, {
											label: $L( "Trim" ),
											command: "combine"
										}, {
											label: $L( "Clear Multiple" ),
											command: "clear_m"
										}, {
											label: $L( "Scroll Top" ),
											command: "scrollTop"
										}, {
											label: $L( "Scroll Bottom" ),
											command: "scrollBot"
										}
									]
								},
								appMenuFeatures,
								cbAboutItem,
								cbHelpItem
							]
						};

		this.controller.setupWidget( Mojo.Menu.appMenu, appMenuOptions, this.transactionScreenMenuModel );

		this.setupLoadingSystem();

		this.scrollerSet = {
				doScroll: true,
				scrollTo: ""
			};

		this.ignoreReload = false;
	},

	ready: function() {

		this.fetchTrsnSortMethods();
	},

	//500ms before activate
	aboutToActivate: function() {

		Mojo.Log.info( "TransactionsAssistant -> aboutToActivate()" );

		this.metaKeyPressed = false;

		if( this.itemEdited === true ) {

			this.itemEdited = false;

			if( this.scrollerSet['doScroll'] === true ) {

				this.updateLoadingSystem( true, $L( "Loading Transactions" ), $L( "Please wait..." ), 0 );
			}

			this.repeat_updateAll( this.loadAccountData.bind( this ) );
		} else {

			if( this.systemActive() ) {

				this.hideLoadingSystemDelayed( 0.5 );
			}
		}
	},

	//Scene made visible
	activate: function( $super, event ) {

		$super();

		Mojo.Log.info( "TransactionsAssistant -> activate()" );

		Mojo.Event.listen( this.controller.get( 'transactionList' ), Mojo.Event.listDelete, this._binds['delete'] );
		Mojo.Event.listen( this.controller.get( 'transactionList' ), Mojo.Event.listTap, this._binds['tap'] );
		Mojo.Event.listen( this.controller.get( 'transactionList' ), Mojo.Event.hold, this._binds['listHold'] );

		Mojo.Event.listen( this.controller.get( 'account-balance-button' ), Mojo.Event.tap, this._binds['balanceTapped'] );
		Mojo.Event.listen( this.controller.get( 'account-switch-button' ), Mojo.Event.tap, this._binds['accountTapped'] );

		Mojo.Event.listen( this.controller.stageController.document, 'keyup', this._binds['metaTapUp'] );
		Mojo.Event.listen( this.controller.stageController.document, 'keydown', this._binds['metaTapDown'] );

		checkAppUpdate( this.controller.stageController );
	},

	metatapUpHandler: function( event ) {

		if( event.metaKey === true ) {

			this.metaKeyPressed = false;
		}
	},

	metatapDownHandler: function( event ) {

		if( event.metaKey === true ) {

			this.metaKeyPressed = true;
		}
	},

	fetchTrsnSortMethods: function() {

		Mojo.Log.info( "TransactionsAssistant -> fetchTrsnSortMethods()" );

		if( !( this.sortOptionsModel == null || this.sortOptionsModel['items'] == null || this.sortOptionsModel['items'].length <= 0 ) ) {

			return;
		}

		accountsDB.transaction(
			(
				function( transaction ) {

					var sortQry = "SELECT sortId, sortGroup, label FROM acctTrsnSortOptn ORDER BY groupOrder ASC, label;";

					transaction.executeSql(
							sortQry,
							[],
							this.fetchTrsnSortMethodsHandler.bind( this ),
							this.sqlError.bind( this, "Add/Edit Acct - fetchTrsnSortMethods" )
					);
				}
			).bind( this ) );
	},

	fetchTrsnSortMethodsHandler: function( transaction, results ) {

		Mojo.Log.info( "TransactionsAssistant -> fetchTrsnSortMethodsHandler()" );

		this.sortOptionsModel['items'].length = 0;

		var offset = 0;
		var currGroup = "";

		for( var i = 0; i < results.rows.length; i++ ) {

			var row = results.rows.item( i );

			if( currGroup !== row['sortGroup'] ) {

				currGroup = row['sortGroup'];

				this.sortOptionsModel['items'][i + offset] = {
					label: $L( currGroup )
				};
				offset++;
			}

			this.sortOptionsModel['items'][i + offset] = {
				label: $L( row['label'] ),
				command: "SORT_COMMAND" + row['sortId']
			};
		}

		this.controller.modelChanged( this.sortOptionsModel );
	},

	transDivFunct: function( itemModel ) {

		var dateItem = new Date( parseInt( itemModel['dateData'] ) );

		return formatDate( dateItem, { date: 'short', time: '' } );
	},

	loadAccountData: function() {

		Mojo.Log.info( "TransactionsAssistant -> loadAccountData()" );

		this.reloadAccount( this.accountId, this.accountIndex, this.loadAccountDataHandler.bind( this ) );
	},

	loadAccountDataHandler: function( transaction, results ) {

		Mojo.Log.info( "TransactionsAssistant -> loadAccountDataHandler()" );

		if( typeof( accounts_obj['items'][this.accountIndex] ) === "undefined" || accounts_obj['items'][this.accountIndex] == null ) {
			//Account does not exist

			this.controller.stageController.popScene();
		}

		//Update app menu
		if( accounts_obj['items'][this.accountIndex]['hide_cleared'] === 1 ) {

//			this.transactionScreenMenuModel['items'][2]['items'][0]['label'] = $L( "Show Cleared" );
		} else {

//			this.transactionScreenMenuModel['items'][2]['items'][0]['label'] = $L( "Hide Cleared" );
		}

		if( accounts_obj['items'][this.accountIndex]['sort'] !== this.currSort ) {

			this.scrollerSet['doScroll'] = true;
			this.currSort = accounts_obj['items'][this.accountIndex]['sort'];
		}

		if( this.ignoreReload === true ) {

			this.ignoreReload = false;
		} else {

			this.controller.get( 'transactionList' ).mojo.setLengthAndInvalidate( accounts_obj['items'][this.accountIndex]['itemCount'] );
		}

		this.controller.get( 'tHeaderIcon' ).update( "<img src='./images/" + accounts_obj['items'][this.accountIndex]['categoryIcon'] + "' alt='' height='30' width='30' />" );
		//this.controller.get( 'account-switch-button' ).addClassName( accounts_obj['items'][this.accountIndex]['categoryColor'] );
		this.controller.get( 'tHeaderText' ).update( cleanString( accounts_obj['items'][this.accountIndex]['name'] ) );

		var tHeaderBalance = this.controller.get( 'tHeaderBalance' );
		tHeaderBalance.update( accounts_obj['items'][this.accountIndex]['balance'] );

		tHeaderBalance.removeClassName( "negativeBalanceLight" );
		tHeaderBalance.removeClassName( "positiveBalanceLight" );
		tHeaderBalance.removeClassName( "neutralBalanceLight" );

		var balance = accounts_obj['items'][this.accountIndex]['balance4'];

		var balanceColor = "neutralBalanceLight";
		if( ( Math.round( balance * 100 ) / 100 ) > 0 ) {

			balanceColor = 'positiveBalanceLight';
		} else if( ( Math.round( balance * 100 ) / 100 ) < 0 ) {

			balanceColor = 'negativeBalanceLight';
		}

		tHeaderBalance.addClassName( balanceColor );

		if( accounts_obj['items'][this.accountIndex]['frozen'] === 1 ) {

			this.controller.setMenuVisible( Mojo.Menu.commandMenu, false );
		} else {

			this.controller.setMenuVisible( Mojo.Menu.commandMenu, true );
		}

		if( this.scrollerSet['doScroll'] === true ) {

			this.scrollerSet['doScroll'] = false;

			if( accounts_obj['items'][this.accountIndex]['sort'] === "0" || accounts_obj['items'][this.accountIndex]['sort'] === "1" || accounts_obj['items'][this.accountIndex]['sort'] === "6" || accounts_obj['items'][this.accountIndex]['sort'] === "7" ) {
				//Sort by date, show newest
				//Sort by status

				accountsDB.transaction(
					(
						function( transaction ) {

							var currDate = new Date();

							if( accounts_obj['items'][this.accountIndex]['showTransTime'] !== 1 ) {

								currDate.setHours( 23, 59, 59, 999 );
							}
							currDate = Date.parse( currDate );

							var expenseQry = "";

							switch( accounts_obj['items'][this.accountIndex]['sort'] ) {
								case "0"://oldest >> newest, show newest
									expenseQry = "SELECT DISTINCT COUNT( itemId ) AS itemIndex FROM transactions main WHERE account = ? AND CAST( date AS INTEGER ) <= " + currDate + " ORDER BY date ASC, itemId ASC;";
									break;
								case "1"://newest >> oldest, show newest
									expenseQry = "SELECT DISTINCT COUNT( itemId ) AS itemIndex FROM transactions main WHERE account = ? AND CAST( date AS INTEGER ) <= " + currDate + " ORDER BY date DESC, itemId DESC;";
									break;
								case "6"://cleared first
									expenseQry = "SELECT DISTINCT COUNT( itemId ) AS itemIndex FROM transactions main WHERE account = ? AND cleared = 1;";
									break;
								case "7"://pending first
									expenseQry = "SELECT DISTINCT COUNT( itemId ) AS itemIndex FROM transactions main WHERE account = ? AND cleared = 0;";
									break;
							}

							transaction.executeSql( expenseQry, [ this.accountId ], this.scrollToCurrentDateHandler.bind( this ), this.sqlError.bind( this, "loadAccountDataHandler", expenseQry ) );
						}
					).bind( this ) );
			} else {

				this.scrollToItem( 0 );
			}
		}

		if( this.systemActive() && accounts_obj['items'][this.accountIndex]['itemCount'] <= 0 ) {

			this.hideLoadingSystemDelayed( 0.5 );
		}
	},

	scrollToCurrentDateHandler: function( transaction, results ) {

		Mojo.Log.info( "TransactionsAssistant -> scrollToCurrentDateHandler()" );

		try {

			var scrollToIndex = 0;

			if( accounts_obj['items'][this.accountIndex]['sort'] === "1" ) {

				scrollToIndex = accounts_obj['items'][this.accountIndex]['itemCount'] - results.rows.item( 0 )['itemIndex'];
			} else {

				scrollToIndex = results.rows.item( 0 )['itemIndex'];
			}

			this.scrollToItem( scrollToIndex );
		} catch( err ) {

			systemError( "Error in Transactions >> scrollToCurrentDateHandler:" + err );

			this.scrollToItem( 0 );
		}
	},

	transactionListCallback: function( listWidget, offset, count ) {

		Mojo.Log.info( "TransactionsAssistant -> transactionListCallback(): " + offset + ", " + count );

		if( this.justTypeGetFilter() !== "" && this.justTypeGetFilter() !== "%%" ) {

			this.filterTransCallback( listWidget, offset, count );
			return;
		}

		Element.show( this.controller.get( 'main' ) );

		if( accounts_obj['items'][this.accountIndex]['itemCount'] <= 0 ) {

			return;
		}

		if( typeof( accounts_obj['items'][this.accountIndex]['sort'] ) !== "undefined" ) {

			accountsDB.transaction(
				(
					function( transaction ) {

						//Adapt for split transactions
						var expenseQry = "SELECT" +
											//Expense table data
											" DISTINCT main.itemId, main.desc, main.amount, main.note, main.date, main.account," +
											" main.linkedRecord, main.linkedAccount, main.cleared, main.repeatId, main.checkNum," +

											//Category information
											" ( CASE WHEN main.category = '||~SPLIT~||' THEN" +
												" ( '[' || ( SELECT GROUP_CONCAT( ( '{ \"category\": \"' || ts.genCat || '\", \"category2\" : \"' || ts.specCat || '\", \"amount\": \"' || ts.amount || '\" }' ), ',' ) FROM transactionSplit ts WHERE ts.transId = main.itemId ) || ']' )" +
											" ELSE main.category END ) AS category," +
											" ( CASE WHEN main.category = '||~SPLIT~||' THEN" +
												" 'PARSE_CATEGORY'" +
											" ELSE main.category2 END ) AS category2," +

											//Repeat table data
											" IFNULL( rr.frequency, '' ) AS frequency," +
											" IFNULL( rr.daysOfWeek, '' ) AS daysOfWeek," +
											" IFNULL( rr.itemSpan, '' ) AS itemSpan," +
											" IFNULL( rr.endingCondition, '' ) AS endingCondition," +
											" IFNULL( rr.endDate, '' ) AS endDate," +
											" IFNULL( rr.endCount, '' ) AS endCount," +
											" IFNULL( rr.currCout, '' ) AS currCout" +
											" FROM transactions main" +
											" LEFT JOIN repeats rr ON rr.repeatId = main.repeatId" +
											" WHERE account = ? ORDER BY " + accounts_obj['items'][this.accountIndex]['sortQry'] + " LIMIT ? OFFSET ?;";

						transaction.executeSql(
								expenseQry,
								[
									this.accountId,
									count,
									offset
								],
								this.queryTLMidHandler.bind( this, offset, count ),
								this.sqlError.bind( this, "transactionListCallback", expenseQry )
							);
					}
				).bind( this ) );
		}
	},

	queryTLMidHandler: function( offset, count, transaction, resultsObj ) {

		Mojo.Log.info( "TransactionsAssistant -> queryTLMidHandler()" );

		if( accounts_obj['items'][this.accountIndex]['runningBalance'] == "1" ) {

			var compDate;

			if( resultsObj.rows.length > 0 ) {

				compDate = resultsObj.rows.item( 0 )['date'];
			} else {

				compDate = Date.parse( new Date() );
			}

			//NEEDS REWORKING: doesn't play nice with pending/cleared setup

			var balanceQry = "SELECT SUM( amount ) AS balanceToDate FROM transactions WHERE account = ? AND date < ?;";

			if( accounts_obj['items'][this.accountIndex]['sort'] !== "0" && accounts_obj['items'][this.accountIndex]['sort'] !== "6" && accounts_obj['items'][this.accountIndex]['sort'] !== "8" ) {

				balanceQry = "SELECT SUM( amount ) AS balanceToDate FROM transactions WHERE account = ? AND date <= ?;";
			}

			transaction.executeSql(
						balanceQry,
						[ this.accountId, compDate ],
						this.queryTLCallbackHandler.bind( this, offset, count, resultsObj ),
						this.sqlError.bind( this, "queryTLMidHandler", balanceQry )
					);

		} else {

			this.queryTLCallbackHandler( offset, count, resultsObj, null, null );
		}
	},

	queryTLCallbackHandler: function( offset, count, resultsObj, transaction, runningBalResults ) {

		var currentBalance = 0;

		if( runningBalResults && typeof( runningBalResults ) !== "undefined" && typeof( runningBalResults.rows.length ) !== "undefined" ) {

			if( offset > 0 || ( accounts_obj['items'][this.accountIndex]['sort'] !== "0" && accounts_obj['items'][this.accountIndex]['sort'] !== "6" && accounts_obj['items'][this.accountIndex]['sort'] !== "8" ) ) {

				currentBalance = runningBalResults.rows.item( 0 )['balanceToDate'];
			}
		}

		var row;

		for( var i = 0; i < resultsObj.rows.length; i++ ) {

			row = resultsObj.rows.item( i );

			if( accounts_obj['items'][this.accountIndex]['sort'] === "0" || accounts_obj['items'][this.accountIndex]['sort'] === "6" || accounts_obj['items'][this.accountIndex]['sort'] === "8" ) {

				currentBalance += row['amount'];
			}

			this.transactionListModel['items'][( offset + i )] = this.buildTransactionObject( row, ( i + offset ), currentBalance, false );

			if( accounts_obj['items'][this.accountIndex]['hide_cleared'] === 1 && row['cleared'] === 1 ) {

				//this.transactionListModel['items'][( offset + i )] = null;

				//this.transactionListModel['items'].splice( ( offset + i ), 1 );
				//i = i - 1;//Need alternate stabilizer besides i
			}

			if( accounts_obj['items'][this.accountIndex]['sort'] !== "0" && accounts_obj['items'][this.accountIndex]['sort'] !== "6" && accounts_obj['items'][this.accountIndex]['sort'] !== "8" ) {

				currentBalance -= row['amount'];
			}
		}

		if( this.controller === null || this.controller.get( 'transactionList' ) === null ) {

			return;
		} else {

			this.controller.get( 'transactionList' ).mojo.noticeUpdatedItems( offset, this.transactionListModel['items'].slice( offset, ( offset + count ) ) );

			if( accounts_obj['items'][this.accountIndex]['itemCount'] && typeof( accounts_obj['items'][this.accountIndex]['itemCount'] ) !== "undefined" ) {

				this.controller.get( 'transactionList' ).mojo.setLength( accounts_obj['items'][this.accountIndex]['itemCount'] );

				if( this.transactionListModel['items'].length !== accounts_obj['items'][this.accountIndex]['itemCount'] ) {

					this.transactionListModel['items'].length = accounts_obj['items'][this.accountIndex]['itemCount'];
				}
			} else {

				this.controller.get( 'transactionList' ).mojo.setLength( this.transactionListModel['items'].length );
			}
		}

		if( this.systemActive() ) {

			this.hideLoadingSystemDelayed( 0.5 );
		}
	},

	filterTransCallback: function( listWidget, offset, count ) {

		Mojo.Log.info( "TransactionsAssistant -> filterTransCallback()" );

		Element.hide( this.controller.get( 'main' ) );

		if( this.justTypeGetCount() <= 0 ) {

			return;
		}

		if( typeof( accounts_obj['items'][this.accountIndex]['sort'] ) !== "undefined" ) {

			accountsDB.transaction(
				(
					function( transaction ) {

						//Adapt for split transactions
						var expenseQry = "SELECT" +
											//Expense table data
											" DISTINCT main.itemId, main.desc, main.amount, main.note, main.date, main.account," +
											" main.linkedRecord, main.linkedAccount, main.cleared, main.repeatId, main.checkNum," +

											//Category information
											" ( CASE WHEN main.category = '||~SPLIT~||' THEN" +
												" ( '[' || ( SELECT GROUP_CONCAT( ( '{ \"category\": \"' || ts.genCat || '\", \"category2\" : \"' || ts.specCat || '\", \"amount\": \"' || ts.amount || '\" }' ), ',' ) FROM transactionSplit ts WHERE ts.transId = main.itemId ) || ']' )" +
											" ELSE main.category END ) AS category," +
											" ( CASE WHEN main.category = '||~SPLIT~||' THEN" +
												" 'PARSE_CATEGORY'" +
											" ELSE main.category2 END ) AS category2," +

											" IFNULL( rr.frequency, '' ) AS frequency," +
											" IFNULL( rr.daysOfWeek, '' ) AS daysOfWeek," +
											" IFNULL( rr.itemSpan, '' ) AS itemSpan," +
											" IFNULL( rr.endingCondition, '' ) AS endingCondition," +
											" IFNULL( rr.endDate, '' ) AS endDate," +
											" IFNULL( rr.endCount, '' ) AS endCount," +
											" IFNULL( rr.currCout, '' ) AS currCout" +
											" FROM transactions main" +
											" LEFT JOIN repeats rr ON rr.repeatId = main.repeatId" +
											" WHERE main.account = ?" +
												" AND ( main.desc LIKE ? OR main.note LIKE ? OR main.checkNum LIKE ? OR main.amount LIKE ? )" +
											" ORDER BY " + accounts_obj['items'][this.accountIndex]['sortQry'] + " LIMIT ? OFFSET ?;";

						transaction.executeSql(
								expenseQry,
								[
									this.accountId,
									this.justTypeGetFilter(),
									this.justTypeGetFilter(),
									this.justTypeGetFilter(),
									this.justTypeGetFilter(),
									count,
									offset
								],
								this.filterTransCallbackHandler.bind( this, offset, count ),
								this.sqlError.bind( this, "filterTransCallback", expenseQry )
							);
					}
				).bind( this ) );
		}
	},

	filterTransCallbackHandler: function( offset, count, transaction, resultsObj ) {

		Mojo.Log.info( "TransactionsAssistant -> filterTransCallbackHandler()" );

		for( var i = 0; i < resultsObj.rows.length; i++ ) {

			this.transactionListModel['items'][( offset + i )] = this.buildTransactionObject( resultsObj.rows.item( i ), ( i + offset ), 0, true );

			if( accounts_obj['items'][this.accountIndex]['hide_cleared'] === 1 && row['cleared'] === 1 ) {

				//this.transactionListModel['items'][( offset + i )] = null;

				//this.transactionListModel['items'].splice( ( offset + i ), 1 );
				//i = i - 1;//Need alternate stabilizer besides i
			}
		}

		if( this.controller === null || this.controller.get( 'transactionList' ) === null ) {

			return;
		}

		this.controller.get( 'transactionList' ).mojo.noticeUpdatedItems( offset, this.transactionListModel['items'].slice( offset, ( offset + count ) ) );

		var totalFilterCount = this.justTypeGetCount();

		if( totalFilterCount && typeof( totalFilterCount ) !== "undefined" ) {

			this.controller.get( 'transactionList' ).mojo.setLength( totalFilterCount );

			if( this.transactionListModel['items'].length !== totalFilterCount ) {

				this.transactionListModel['items'].length = totalFilterCount;
			}
		} else {

			this.controller.get( 'transactionList' ).mojo.setLength( this.transactionListModel['items'].length );
		}

		if( this.systemActive() ) {

			this.hideLoadingSystemDelayed( 0.5 );
		}
	},

	/** Handles building the transaction object for standard view and search view **/
	buildTransactionObject: function( row, index, currentBalance, search ) {

		if( typeof( search ) === "undefined" ) {

			search = false;
		}

		var transferCheck = ( row['linkedRecord'] && !isNaN( row['linkedRecord'] ) && row['linkedRecord'] != "" );
		var repeatCheck = ( row['repeatId'] && !isNaN( row['repeatId'] ) && row['repeatId'] != "" );
		var transactionType = "";

		if( transferCheck === true && repeatCheck === true ) {
			//Transfer and Recurring

			transactionType = "repeatTransferIcon";
		} else if( transferCheck === true && repeatCheck !== true ) {
			//Transfer Only

			transactionType = "transferIcon";
		} else if( transferCheck !== true && repeatCheck === true ) {
			//Recurring Only

			transactionType = "repeatIcon";
		}

		//Create date item
		var dateObj = new Date( parseInt( row['date'] ) );

		var today = new Date();

		if( accounts_obj['items'][this.accountIndex]['showTransTime'] !== 1 ) {

			today.setHours( 23, 59, 59, 999 );
		}

		var dispRunningBalance = (
				!search &&//Override for search mode. Do not display running balance systems if set to true
				accounts_obj['items'][this.accountIndex]['runningBalance'] === 1 &&
				(
					accounts_obj['items'][this.accountIndex]['sort'] === "0" ||
					accounts_obj['items'][this.accountIndex]['sort'] === "1" ||
					accounts_obj['items'][this.accountIndex]['sort'] === "6" ||
					accounts_obj['items'][this.accountIndex]['sort'] === "7" ||
					accounts_obj['items'][this.accountIndex]['sort'] === "8"
				)
			);

		var dispCheckNum = ( accounts_obj['items'][this.accountIndex]['checkField'] === 1 && row['checkNum'] && row['checkNum'] !== "" );

		var amountColor = '';
		if( !dispRunningBalance ) {

			if( ( Math.round( row['amount'] * 100 ) / 100 ) < 0 ) {

				amountColor = 'negativeFunds';
			} else if( ( Math.round( row['amount'] * 100 ) / 100 ) > 0 ) {

				amountColor = 'positiveFunds';
			} else {

				amountColor = 'neutralFunds';
			}
		}

		var balanceColor = 'neutralFunds';
		if( ( Math.round( currentBalance * 100 ) / 100 ) > 0 ) {

			balanceColor = 'positiveFunds';
		} else if( ( Math.round( currentBalance * 100 ) / 100 ) < 0 ) {

			balanceColor = 'negativeFunds';
		}

		var catDisplayItem = '';

		//Adapt for split transactions
		if( accounts_obj['items'][this.accountIndex]['enableCategories'] === 1 ) {

			//Split Category
			if( row['category2'] === 'PARSE_CATEGORY' ) {

				//JSON formatted string [{ category, category2, amount }]
				var catObj = row['category'].evalJSON();

				catDisplayItem += "<div class='splitCatContainer'>";

				for( var i = 0; i < ( catObj.length > 3 ? 2 : catObj.length ); i++ ) {

					catDisplayItem += "<div class='categoryGroup'>" + catObj[i]['category'] + " &raquo; " + catObj[i]['category2'] + "</div>" +
										"<div class='categoryAmount'>" + catObj[i]['amount'] + "</div>";
				}

				if( catObj.length > 3 ) {

					catDisplayItem += "+ " + ( catObj.length - 2 ) + " more";
				}

				catDisplayItem += "</div>";
			} else {

				//Old Format Category
				if( row['category2'] === null ) {

					var cat = row['category'].split( "|", 2 );
					catDisplayItem = cat[0] + " &raquo; " + cat[1] + "<br />";
				} else {

					catDisplayItem = row['category'] + " &raquo; " + row['category2'] + "<br />";
				}
			}
		}

		if( catDisplayItem == " &raquo; " ) {

			catDisplayItem = "";
		}

		return( {
				//Record items
				rowCount: index,

				//Data
				id: "ID" + row['itemId'],
				descData: row['desc'],
				amountData: row['amount'],
				cleared: row['cleared'],
				note: row['note'],
				dateData: parseInt( row['date'] ),
				account: row['account'],
				category: row['category'],
				category2: row['category2'],
				linkedRecord: row['linkedRecord'],
				linkedAccount: row['linkedAccount'],
				checkNum: row['checkNum'],

				//Repeating Item
				repeatId: row['repeatId'],
				repeatUnlinked: row['repeatUnlinked'],
				repeatFrequency: row['frequency'],
				repeatDaysOfWeek: row['daysOfWeek'],
				repeatItemSpan: row['itemSpan'],
				repeatEndingCondition: row['endingCondition'],
				repeatEndDate: row['endDate'],
				repeatEndCount: row['endCount'],
				repeatCurrCount: row['currCout'],

				//Display Items
				amount: formatAmount( row['amount'] ),
				desc: stripHTML( row['desc'] ),
				date: formatDate( dateObj, {date: 'medium', time: ( accounts_obj['items'][this.accountIndex]['showTransTime'] == 1 ? 'short' : '' ) } ),
				noteDisplay: ( accounts_obj['items'][this.accountIndex]['hideNotes'] === 1 ? "" : formatNotes( row['note'] ) ),
				checkNumDisplay: ( dispCheckNum ? "Check #" + row['checkNum'] + "<br />" : "" ),
				runningBalance: ( dispRunningBalance ? formatAmount( currentBalance ) : "" ),
				catDisplay: catDisplayItem,

				//Formatting items
				amountColor: amountColor,
				balanceColor: balanceColor,
				transactionIcon: transactionType,
				altRow: ( ( index % 2 ) == 0 ? 'altRow' : 'normRow' ),
				futureTransaction: ( ( row['date'] <= Date.parse( today ) ) ? ' ' : 'futureTransaction' ),
				clearedTransaction: ( ( row['cleared'] === 0 ) ? '' : 'true' )
			} );
	},

	/********************/
	/** Event Controls **/
	/********************/
	/** List Item tapped **/
	transactionTapHandler: function( event ) {

		Mojo.Log.info( "TransactionsAssistant -> transactionTapHandler()" );

		if( accounts_obj['items'][this.accountIndex]['frozen'] !== 1 ) {

			if( event.originalEvent.target.className.toLowerCase() === "cleared" || event.originalEvent.target.id.toLowerCase().indexOf( "_transactioncleared" ) >= 0 ) {

				this.transactionClearedHandler( parseInt( event.item['id'].replace( /ID/i, "" ) ), event.item['rowCount'] );
			} else {

				if( this.metaKeyPressed ) {

					this.launchAddEditTransaction( 'NEW_CLONE', event.item['rowCount'] );
				} else {

					this.launchAddEditTransaction( 'EDIT_TRANSACTION', event.item['rowCount'] );
				}
			}
		}
	},

	/** List Item deleted **/
	transactionDeleteHandler: function( event ) {

		Mojo.Log.info( "TransactionsAssistant -> transactionDeleteHandler()" );

		event.stop();

		this.qryTransactionDeleteHandler( parseInt( event.item.id.replace( /ID/i, "" ) ), event.item['rowCount'] );
	},

	qryTransactionDeleteHandler: function( deleteItemId, deleteItemRowCount ) {

		Mojo.Log.info( "TransactionsAssistant -> qryTransactionDeleteHandler()" );

		var acct = this.transactionListModel['items'][deleteItemRowCount]['account'];
		var linkAcct = this.transactionListModel['items'][deleteItemRowCount]['linkedAccount'];

		if( accounts_obj['items'][this.accountIndex]['frozen'] !== 1 ) {

			if( this.transactionListModel['items'][deleteItemRowCount]['repeatId'] !== "" ) {

				//Recurring Delete Dialog
				this.controller.showAlertDialog(
						{
							onChoose: function( deleteChoice ) {

								//Remove and hide deleted item
								this.transactionListModel['items'].splice( deleteItemRowCount, 1 );
								this.controller.get( 'transactionList' ).mojo.noticeRemovedItems( deleteItemRowCount, 1 );

								this.repeat_deleteItem( deleteItemId, acct, linkAcct, this.transactionListModel['items'][deleteItemRowCount]['repeatId'], deleteChoice, this.loadAccountData.bind( this ) );
							},
							preventCancel: true,
							title: $L( "Delete Transaction" ),
							message: $L( "This is a recurring transaction..." ),
							choices: [
								{
									label: $L( 'Only this instance' ),
									value: 'this',
									type: 'negative'
								}, {
									label: $L( 'All events in the series' ),
									value: 'all',
									type: 'negative'
								}, {
									label: $L( 'All following' ),
									value: 'future',
									type: 'negative'
								}
							]
						}
					);
			} else {

				this.updateLoadingSystem( true, $L( "Loading Transactions" ), $L( "Please wait..." ), 0 );

				//Remove and hide deleted item
				this.transactionListModel['items'].splice( deleteItemRowCount, 1 );
				this.controller.get( 'transactionList' ).mojo.noticeRemovedItems( deleteItemRowCount, 1 );

				this.deleteTransaction( deleteItemId, acct, linkAcct, this.loadAccountData.bind( this ) );
			}
		}
	},

	qryTransactionPurgeHandler: function( cleared, dateToggle, date ) {

		Mojo.Log.info( "TransactionsAssistant -> qryTransactionPurgeHandler()" );

		try {

			if( accounts_obj['items'][this.accountIndex]['frozen'] !== 1 ) {

				accountsDB.transaction(
					(
						function( transaction ) {

							var additionalOptions = "";

							if( cleared === "1" ) {

								additionalOptions += " AND cleared = 1";
							}

							if( dateToggle === "1" ) {

								//set time of date elem to 11:59:59 pm
								date.setHours( 23, 59, 59, 999 );

								additionalOptions += " AND CAST( date AS INTEGER ) <= " + Date.parse( date );
							}

							var purgeQry = "DELETE FROM transactions WHERE account = ?" + additionalOptions + ";";

							transaction.executeSql( purgeQry, [ this.accountId ], this.successHandler( this ), this.sqlError.bind( this, "transactionPurgeHandler", deleteQry ) );

							var deleteQry = "UPDATE transactions SET linkedAccount = '', linkedRecord = '' WHERE linkedAccount = ?" + additionalOptions + ";";

							transaction.executeSql( deleteQry, [ this.accountId ], this.qryCombineAllHandlerComplete.bind( this ), this.sqlError.bind( this, "transactionPurgeHandler", deleteQry ) );
						}
					).bind( this ) );
			}
		} catch( err ) {

			systemError( "Error in Transactions >> qryTransactionPurgeHandler:" + err );
		}
	},

	qryTransactionCombineHandler: function( cleared, dateToggle, date ) {

		Mojo.Log.info( "TransactionsAssistant -> qryTransactionCombineHandler()" );

		try {

			if( accounts_obj['items'][this.accountIndex]['frozen'] !== 1 ) {

				accountsDB.transaction(
					(
						function( transaction ) {

							var additionalOptions = "";

							if( cleared === "1" ) {

								additionalOptions += " AND cleared = 1";
							}

							if( dateToggle === "1" ) {

								//set time of date elem to 11:59:59 pm
								date.setHours( 23, 59, 59, 999 );

								additionalOptions += " AND CAST( date AS INTEGER ) <= " + Date.parse( date );
							}

							var accountQry = "SELECT IFNULL( SUM( transactions.amount ), 0 ) AS balance FROM transactions WHERE account = ?" + additionalOptions;

							//put function in here
							transaction.executeSql( accountQry, [ this.accountId ], this.qryCombineAllHandler.bind( this, additionalOptions, cleared, dateToggle, date ), this.sqlError.bind( this, accountQry ) );
						}
					).bind( this ) );
			}
		} catch( err ) {

			systemError( "Error in Transactions >> qryTransactionCombineHandler:" + err );
		}
	},

	qryCombineAllHandler: function( additionalOptions, cleared, dateToggle, dateItem, transaction, results ) {

		Mojo.Log.info( "TransactionsAssistant -> qryCombineAllHandler()" );

		try {

			if( accounts_obj['items'][this.accountIndex]['frozen'] !== 1 && results.rows.length >= 1 ) {

				accountsDB.transaction(
					(
						function( transaction ) {

							transaction.executeSql( "DELETE FROM transactions WHERE account = ?" + additionalOptions + ";", [ this.accountId ] );

							transaction.executeSql( "UPDATE transactions SET linkedAccount = '', linkedRecord = '' WHERE linkedAccount = ?" + additionalOptions + ";", [ this.accountId ] );

							var qryInsertTransaction = "INSERT INTO transactions( desc, amount, cleared, note, date, account, category, category2 ) VALUES( ?, ?, ?, ?, ?, ?, ?, ? );";

							var amount = results.rows.item(0)['balance'];

							transaction.executeSql(
									qryInsertTransaction,
									[
										"Combined Transaction",
										Number( amount.toFixed( 2 ) ).valueOf(),
										1,
										$L( cleared === "1" ? "[Cleared Transactions]" : "[All Transactions]" ) + ( dateToggle === "1" ? "[" + formatDate( dateItem, { date: 'short', time: '' } ) + "]" : "" ),
										Date.parse( dateItem ),
										this.accountId,
										$L( "System Function" ),
										$L( cleared === "1" ? "Cleared Transactions" : "All Transactions" )
									],
									this.qryCombineAllHandlerComplete.bind( this ),
									this.sqlError.bind( this, qryInsertTransaction )
								);
						}
					).bind( this ) );
			}
		} catch( err ) {

			systemError( "Error in Transactions >> qryCombineAllHandler:" + err );
		}
	},

	qryTransactionClearMHandler: function( cleared, dateToggle, date ) {

		Mojo.Log.info( "TransactionsAssistant -> qryTransactionClearMHandler()" );

		try {

			if( accounts_obj['items'][this.accountIndex]['frozen'] !== 1 ) {

				accountsDB.transaction(
					(
						function( transaction ) {

							var additionalOptions = "";

							if( dateToggle === "1" ) {

								//set time of date elem to 11:59:59 pm
								date.setHours( 23, 59, 59, 999 );

								additionalOptions = " AND CAST( date AS INTEGER ) <= " + Date.parse( date );
							}

							var qryClearM = "UPDATE transactions SET cleared = ? WHERE account = ?" + additionalOptions + ";";

							transaction.executeSql(
									qryClearM,
									[ "1", this.accountId ],
									this.qryCombineAllHandlerComplete.bind( this ),
									this.sqlError.bind( this, "qryTransactionClearMHandler", qryClearM )
								);
						}
					).bind( this ) );
			}
		} catch( err ) {

			systemError( "Error in Transactions >> qryTransactionClearMHandler:" + err );
		}
	},

	qryCombineAllHandlerComplete: function( transaction, results ) {

		Mojo.Log.info( "TransactionsAssistant -> qryCombineAllHandlerComplete()" );

		if( !this.systemActive() ) {

			this.updateLoadingSystem( true, $L( "Loading Transactions" ), $L( "Please wait..." ), 0 );
		}

		accounts_obj['items_changed'] = true;

		this.zeroOverallBalance();
		this.loadAllAccounts( 0, 25, this.loadAccountData.bind( this ) );
	},

	/** List Item cleared **/
	transactionClearedHandler: function( itemId, refId ) {

		Mojo.Log.info( "TransactionsAssistant -> transactionClearedHandler()" );

		try {

			if( this.transactionListModel['items'][refId]['cleared'] === 0 ) {

				this.transactionListModel['items'][refId]['cleared'] = 1;
			} else {

				this.transactionListModel['items'][refId]['cleared'] = 0;
			}

			this.transactionListModel['items'][refId]['clearedTransaction'] = ( ( this.transactionListModel['items'][refId]['cleared'] === 0 ) ? '' : 'true' );

			this.controller.get( 'transactionList' ).mojo.noticeUpdatedItems( refId, this.transactionListModel['items'].slice( refId, refId + 1 ) );

			accountsDB.transaction(
				(
					function( transaction ) {

						var qryUpdateTransaction = 'UPDATE transactions SET cleared = ? WHERE itemId = ?;';

						transaction.executeSql( qryUpdateTransaction, [ this.transactionListModel['items'][refId]['cleared'], itemId ], this.successHandler.bind( this ), this.sqlError.bind( this, qryUpdateTransaction ) );
					}
				).bind( this ) );

			//Refresh transaction data
			this.ignoreReload = true;
		} catch( err ) {

			systemError( "Error in Transactions >> transactionClearedHandler:" + err );
		}

		this.loadAccountData();
	},

	/** List Item held **/
	listHoldHandler: function( event ) {

		Mojo.Log.info( "TransactionsAssistant -> listHoldHandler()" );

		this.transactionListHoldTarget = "";

		var parentElem = event.target;
		var i = 0;

		while( i < 5 && parentElem.id.toLowerCase().indexOf( "_transactionwrapper" ) < 0 ) {

			try {

				parentElem = parentElem.parentNode;
			} catch( err ) {

				//Mojo.Controller.errorDialog( "Error: " + err );
			}
			i++;
		}

		try {
			this.transactionListHoldTarget = parentElem.id;
		} catch( err ) {

			Mojo.Controller.errorDialog( "Error: " + err );
		}

		if( this.transactionListHoldTarget.toLowerCase().indexOf( "_transactionwrapper" ) >= 0 ) {

			this.transactionListHoldTarget = this.transactionListHoldTarget.replace( /_transactionWrapper/i, "" );

			if( accounts_obj['items'][this.accountIndex]['frozen'] !== 1 ) {

				var popupMenuItems = [
								{
									label: ( ( this.transactionListModel['items'][this.transactionListHoldTarget]['cleared'] === 0 ) ? 'C' : 'Unc' ) + 'lear Transaction',
									command: 'clear'
								}, {
									label: $L( 'Edit Transaction' ),
									command: 'edit'
								}, {
									label: $L( 'Duplicate Transaction' ),
									command: 'duplicate'
								}, {
									label: $L( 'Delete Transaction' ),
									command: 'delete'
								}
							];


				this.controller.popupSubmenu(
						{
							onChoose: this.trsnPopupHandler,
							placeNear: event.target,
							items: popupMenuItems
						}
					);
			}
		}

		//End event
		event.stop();
	},

	trsnPopupHandler: function( command ) {

		Mojo.Log.info( "TransactionsAssistant -> trsnPopupHandler()" );

		if( this.transactionListHoldTarget !== "" ) {

			var transactionItem = this.transactionListModel['items'][this.transactionListHoldTarget];
			var transactionItemId = transactionItem['id'].replace( /ID/i, "" );

			switch( command ) {
				case 'clear':
					this.transactionClearedHandler( parseInt( transactionItemId ), this.transactionListHoldTarget );
					break;
				case 'edit':
					this.launchAddEditTransaction( 'EDIT_TRANSACTION', transactionItem['rowCount'] );
					break;
				case 'duplicate':
					this.launchAddEditTransaction( 'NEW_CLONE', transactionItem['rowCount'] );
					break;
				case 'delete':
					this.controller.showAlertDialog(
							{
								onChoose: function( value ) {

									if( value === true ) {

										this.qryTransactionDeleteHandler( parseInt( transactionItemId ), transactionItem['rowCount'] );
									}
								},
								title: $L( "Delete" ),
								message: $L( "Are you sure you want to delete" ) + " [" + this.transactionListModel['items'][this.transactionListHoldTarget]['desc'] + "]?",
								choices: [
									{
										label: $L( 'Delete expense' ),
										value: true,
										type: 'negative'
									}, {
										label: $L( 'Do not delete expense' ),
										value: false
									}
								]
							}
						);
					break;
			}
		}
	},

	/** Handle Inputs **/
	handleCommand: function( event ) {

		Mojo.Log.info( "TransactionsAssistant -> handleCommand()" );

		if( event.type === Mojo.Event.command ) {

			if( event.command.indexOf( "SORT_COMMAND" ) !== -1 ) {

				var sortCommand = event.command.replace( "SORT_COMMAND", "" );

				this.resetScroll = true;
				this.updateLoadingSystem( true, $L( "Loading Transactions" ), $L( "Please wait..." ), 0 );

				qryAccountsUpdate = "UPDATE accounts SET sort = ? WHERE acctId = ?;";

				accountsDB.transaction(
					(
						function( transaction ) {

							transaction.executeSql(
									qryAccountsUpdate,
									[ sortCommand, this.accountId ],
									function( trsn, results ) {

										this.loadAccountData();
									}.bind( this ),
									this.sqlError.bind( this, qryAccountsUpdate ) );
						}
					).bind( this ) );
			} else {

				if( event.command === 'import' ) {

					this.itemEdited = true;
				} else if( event.command ===  'income' ) {

					this.launchAddEditTransaction( 'income', "" );
					this.resetScroll = true;
					event.stop();
				} else if( event.command ===  'transfer' ) {

					this.launchAddEditTransaction( 'transfer', "" );
					this.resetScroll = true;
					event.stop();
				} else if( event.command ===  'expense' ) {

					this.launchAddEditTransaction( 'expense', "" );
					this.resetScroll = true;
					event.stop();
				} else if( event.command ===  'showhide' ) {

					this.showHideClearedTransactions();
					event.stop();
				} else if( event.command ===  'purge' ) {

					if( accounts_obj['items'][this.accountIndex]['frozen'] !== 1 ) {

						this.controller.stageController.pushScene( "transactionUtil", this, "purge" );
					}
					event.stop();
				} else if( event.command ===  'combine' ) {

					if( accounts_obj['items'][this.accountIndex]['frozen'] !== 1 ) {

						this.controller.stageController.pushScene( "transactionUtil", this, "combine" );
					}
					event.stop();
				} else if( event.command ===  'clear_m' ) {

					if( accounts_obj['items'][this.accountIndex]['frozen'] !== 1 ) {

						this.controller.stageController.pushScene( "transactionUtil", this, "clear_m" );
					}
					event.stop();
				} else if( event.command ===  'scrollTop' ) {

					this.scrollToItem( 0 );
					event.stop();
				} else if( event.command ===  'scrollBot' ) {

					this.scrollToItem( accounts_obj['items'][this.accountIndex]['itemCount'] );
					event.stop();
				}
			}
		}
	},

	showHideClearedTransactions: function() {

		Mojo.Log.info( "TransactionsAssistant -> showHideClearedTransactions()" );

		if( accounts_obj['items'][this.accountIndex]['hide_cleared'] === 1 ) {

			accounts_obj['items'][this.accountIndex]['hide_cleared'] = 0;
		} else {

			accounts_obj['items'][this.accountIndex]['hide_cleared'] = 1;
		}

		//update DB
		this.resetScroll = true;
		this.updateLoadingSystem( true, $L( "Loading Transactions" ), $L( "Please wait..." ), 0 );

		qryAccountsUpdate = "UPDATE accounts SET hide_cleared = ? WHERE acctId = ?;";

		accountsDB.transaction(
			(
				function( transaction ) {

					transaction.executeSql(
							qryAccountsUpdate,
							[ accounts_obj['items'][this.accountIndex]['hide_cleared'], this.accountId ],
							function( trsn, results ) {

								this.loadAccountData();
							}.bind( this ),
							this.sqlError.bind( this, qryAccountsUpdate ) );
				}
			).bind( this ) );
	},

	/** Header Tapped **/
	tHeaderBalanceTapped: function() {

		Mojo.Log.info( "TransactionsAssistant -> tHeaderBalanceTapped()" );

		this.popupBalance = [
						{
							label: this.formatBalancePopup( $L( "Available:" ), accounts_obj['items'][this.accountIndex]['balance0'] ),
							command: '0'
						}, {
							label: this.formatBalancePopup( $L( "Cleared:" ), accounts_obj['items'][this.accountIndex]['balance1'] ),
							command: '1'
						}, {
							label: this.formatBalancePopup( $L( "Pending:" ), accounts_obj['items'][this.accountIndex]['balance3'] ),
							command: '3'
						}, {
							label: this.formatBalancePopup( $L( "Final:" ), accounts_obj['items'][this.accountIndex]['balance2'] ),
							command: '2'
						}
					];


		this.controller.popupSubmenu(
				{
					toggleCmd: accounts_obj['items'][this.accountIndex]['bal_view'],
					manualPlacement: true,
					popupClass: "balance-popup",
					items: this.popupBalance,
					onChoose: this.tHeaderBalanceHandler
				}
			);
	},

	formatBalancePopup: function( type, value ) {

		Mojo.Log.info( "TransactionsAssistant -> formatBalancePopup()" );

		var balanceColor = "neutralFunds";
		if( ( Math.round( value * 100 ) / 100 ) > 0 ) {

			balanceColor = 'positiveFunds';
		} else if( ( Math.round( value * 100 ) / 100 ) < 0 ) {

			balanceColor = 'negativeFunds';
		}

		return( type + " <span class='value " + balanceColor + "'>" + formatAmount( parseFloat( value ) ) + "</span>" );
	},

	tHeaderBalanceHandler: function( command ) {

		Mojo.Log.info( "TransactionsAssistant -> tHeaderBalanceHandler()" );

		if( command && typeof( command ) !== "undefined" && command !== "" && !isNaN( command ) ) {

			accounts_obj['items'][this.accountIndex]['bal_view'] = command;

			var currentBalance = 0;

			switch( accounts_obj['items'][this.accountIndex]['bal_view'] ) {
				case '0':
					currentBalance = accounts_obj['items'][this.accountIndex]['balance0'];
					break;
				case '1':
					currentBalance = accounts_obj['items'][this.accountIndex]['balance1'];
					break;
				case '2':
					currentBalance = accounts_obj['items'][this.accountIndex]['balance2'];
					break;
				case '3':
					currentBalance = accounts_obj['items'][this.accountIndex]['balance3'];
					break;
				default:
					currentBalance = 0;
			}

			accounts_obj['items'][this.accountIndex]['balance4'] = currentBalance;
			accounts_obj['items'][this.accountIndex]['balance'] = formatAmount( parseFloat( currentBalance ) );

			var tHeaderBalance = this.controller.get( 'tHeaderBalance' );
			tHeaderBalance.update( accounts_obj['items'][this.accountIndex]['balance'] );

			tHeaderBalance.removeClassName( "negativeBalanceLight" );
			tHeaderBalance.removeClassName( "positiveBalanceLight" );
			tHeaderBalance.removeClassName( "neutralBalanceLight" );

			var balanceColor = "neutralBalanceLight";
			if( ( Math.round( currentBalance * 100 ) / 100 ) > 0 ) {

				balanceColor = 'positiveBalanceLight';
			} else if( ( Math.round( currentBalance * 100 ) / 100 ) < 0 ) {

				balanceColor = 'negativeBalanceLight';
			}

			tHeaderBalance.addClassName( balanceColor );

			qryAccountsUpdate = "UPDATE accounts SET bal_view = ? WHERE acctId = ?;";

			accountsDB.transaction(
				(
					function( transaction ) {

						transaction.executeSql(
								qryAccountsUpdate,
								[ accounts_obj['items'][this.accountIndex]['bal_view'], this.accountId ],
								this.successHandler.bind( this ),
								this.sqlError.bind( this, qryAccountsUpdate ) );
					}
				).bind( this ) );
		}
	},

	accountSelectorTapped: function( event ) {

		Mojo.Log.info( "TransactionsAssistant -> accountSelectorTapped()" );

		event.stop();

		this.controller.popupSubmenu(
				{
					onChoose: this.accountSelectorTappedHandler.bind( this ),
					toggleCmd: this.accountId,
					manualPlacement: true,
					popupClass: "account-switch-popup",
					items: accounts_obj['popup']
				}
			);
	},

	accountSelectorTappedHandler: function( value ) {

		Mojo.Log.info( "TransactionsAssistant -> accountSelectorTappedHandler()" );

		if( typeof( value ) !== "undefined" && value != "" && value != this.accountId) {

			this.getAccountById( value, this.accountSelectorHandler.bind( this, value ) );
		}
	},

	/** Change settings to match current account **/
	accountSelectorHandler: function( sAcctId, sAcctIndex ) {

		Mojo.Log.info( "TransactionsAssistant -> accountSelectorHandler()" );

		if( sAcctId < 0 || sAcctIndex === -1 ) {

			return;
		}

		if( accounts_obj['items'][sAcctIndex]['locked'] == 1 ) {

			this.controller.stageController.swapScene( "login", { name: "transactions" }, accounts_obj['items'][sAcctIndex]['lockedCode'], "back", sAcctId, sAcctIndex );
		} else {

			this.controller.stageController.swapScene( "transactions", sAcctId, sAcctIndex );
		}
	},

	launchAddEditTransaction: function( transType, transItemLocation ) {

		Mojo.Log.info( "TransactionsAssistant -> launchAddEditTransaction()" );

		this.updateLoadingSystem( true, $L( "Loading Transactions" ), $L( "Please wait..." ), 0 );

		this.controller.stageController.pushScene( "addEdit-transaction", this, transType, transItemLocation );

		this.hideLoadingSystemDelayed( 0 );
/*
		//works now, need to make sure data is shared properly
		//when finished in addEdit scene, then need to close that stage and update this one
		//only do this if I can focus again on the main window

		var pushMainScene = function( stageController ) {

			stageController.pushScene( "addEdit-transaction", this, transType, transItemLocation );
		};

		Mojo.Controller.getAppController().createStageWithCallback( { name: 'addEditTrans' }, pushMainScene.bind( this ), 'card' );
*/
	},

	scrollToItem: function( index ) {

		Mojo.Log.info( "TransactionsAssistant -> scrollToItem()" );

		try {

			this.controller.get( 'transactionList' ).mojo.revealItem( index, false );
			this.controller.get( 'transactionList' ).mojo.revealItem.delay( 0.1, index, false );
		} catch( err ) {

			systemError( 'Transaction Scrolling Error: ' + err );
		}
	},

	deactivate: function( $super, event ) {

		$super();

		Mojo.Log.info( "TransactionsAssistant -> deactivate()" );

		Mojo.Event.stopListening( this.controller.get( 'transactionList' ), Mojo.Event.listDelete, this._binds['delete'] );
		Mojo.Event.stopListening( this.controller.get( 'transactionList' ), Mojo.Event.listTap, this._binds['tap'] );
		Mojo.Event.stopListening( this.controller.get( 'transactionList' ), Mojo.Event.hold, this._binds['listHold'] );

		Mojo.Event.stopListening( this.controller.get( 'account-balance-button' ), Mojo.Event.tap, this._binds['balanceTapped'] );
		Mojo.Event.stopListening( this.controller.get( 'account-switch-button' ), Mojo.Event.tap, this._binds['accountTapped'] );

		Mojo.Event.stopListening( this.controller.stageController.document, 'keyup', this._binds['metaTapUp'] );
		Mojo.Event.stopListening( this.controller.stageController.document, 'keydown', this._binds['metaTapDown'] );
	},

	cleanup: function( $super, event ) {

		$super();

		Mojo.Log.info( "TransactionsAssistant -> cleanup()" );

		this.transactionListModel['items'].clear();
		this.transactionListModel['items'] = null;
	}
} );