/* Copyright 2009 and forward GlitchTech Science.  All rights reserved. */

var SearchTransactionsAssistant = Class.create( commonModel, {

	initialize: function( $super, searchArugmentsIn, autoSearchIn ) {

		$super();
		//fetch all accounts & categories (in segments of 50 items a run)

		if( typeof( autoSearchIn ) === "undefined" || typeof( searchArugmentsIn ) === "undefined" ) {

			var temp = new Date();
			temp.setMonth( temp.getMonth() - 1 );

			this.autoSearch = false;

			this.searchStringModel = { value: "" };
			this.clearedStatusModel = {
				value: 1,
				choices: [
					{
						label: $L( "All" ),
						value: 2
					}, {
						label: $L( "Cleared" ),
						value: 1
					}, {
						label: $L( "Uncleared" ),
						value: 0
					}
				]
			};
			this.startDateModel = { date:temp };
			this.endDateModel = { date:new Date() };
			this.categoryModel = "";
			this.category2Model = "";
			this.accountModel = [];
		} else {

			this.autoSearch = autoSearchIn;

			this.searchStringModel = { value: searchArugmentsIn['string'] };
			this.clearedStatusModel = {
				value: searchArugmentsIn['cleared'],
				choices: [
					{
						label: $L( "All" ),
						value: 2
					}, {
						label: $L( "Cleared" ),
						value: 1
					}, {
						label: $L( "Uncleared" ),
						value: 0
					}
				]
			};
			this.startDateModel = { date:searchArugmentsIn['startDate'] };
			this.endDateModel = { date:searchArugmentsIn['stopDate'] };
			this.categoryModel = searchArugmentsIn['category'];
			this.category2Model = searchArugmentsIn['category2'];
			this.accountModel = searchArugmentsIn['accounts'];
		}

		this.selectCategoryEvent = this.selectCategory.bindAsEventListener( this );
		this.selectAccountEvent = this.selectAccount.bindAsEventListener( this );
		this.transactionTapHandlerEvent = this.transactionTapHandler.bindAsEventListener( this );

		this.sortMode = "1";
		this.listLength = 0;
		this.accountObject = {};
		this.itemEdited = true;

		this.fetchTrsnSortMethods();
	},

	setup: function() {

		this.controller.setupWidget(
				"searchString",
				{//Attributes
					hintText: $L( "Search String..." ),
					multiline: false
				},
				this.searchStringModel
			);

		this.controller.setupWidget(
				"clearedStatus",
				{//Attributes
					label: $L( "Cleared State" )
				},
				this.clearedStatusModel
			);

		this.controller.setupWidget(
				'startDate',
				{
					label: $L( "Start Date" ),
					modelProperty:'date'
				},
				this.startDateModel
			);

		this.controller.setupWidget(
				'endDate',
				{
					label: $L( "End Date" ),
					modelProperty:'date'
				},
				this.endDateModel
			);

		//False model data
		this.transactionListModel = {
			items: []
		};

		//Prepare attribute data
		this.dataAttr = {
			renderLimit:30,
			lookahead:15,
			itemsCallback:this.runSearchCallback.bind( this ),

			itemTemplate:'search-transactions/transactionItemTemplate',
			nullItemTemplate:'transactions/pendingItemTemplate',

			hasNoWidgets: true,
			swipeToDelete: false,
			reorderable: false
		};

		this.controller.setupWidget( 'searchList', this.dataAttr, this.transactionListModel );

		this.setupLoadingSystem();

		/** Control Buttons **/
		this.sortOptionsModel = {
				items: []
			};

		this.controller.setupWidget( 'sort-sub-menu', null, this.sortOptionsModel );

		this.cmdMenuModel = {
					visible: true,
					items: [
						{}, {}, {}
					]
				};

		if( this.autoSearch === false ) {

			this.cmdMenuModel['items'][2] = { icon:'search', command:'search' };
		} else {

			this.cmdMenuModel['items'][0] = { icon:'sort', submenu:'sort-sub-menu' };
		}

		this.controller.setupWidget( Mojo.Menu.commandMenu, {}, this.cmdMenuModel );

		var trendMenuModel = {
							visible: true,
							items: [
								Mojo.Menu.editItem,
								appMenuPrefAccountsDisabled,
								appMenuFeaturesDisabled,
								cbAboutItem,
								cbHelpItem
							]
						};

		this.controller.setupWidget( Mojo.Menu.appMenu, appMenuOptions, trendMenuModel );
	},

	ready: function() {

		this.controller.get( 'search-transaction-header' ).update( $L( "Transaction Search" ) );
		this.controller.get( 'search-menu-header' ).update( $L( "Search Options" ) );
		this.controller.get( 'search-account-label' ).update( $L( "Accounts" ) );
		this.controller.get( 'search-category-label' ).update( $L( "Category" ) );
systemError( "ready" );
		return;

		if( this.autoSearch === false ) {

			Element.show( this.controller.get( 'searchMenu' ) );
			Element.hide( this.controller.get( 'searchList' ) );

			this.listLength = 0;
		} else {

			this.startSpinner();

			Element.hide( this.controller.get( 'searchMenu' ) );
			Element.show( this.controller.get( 'searchList' ) );

			this.runSearch();
		}
	},

	//500ms before activate
	aboutToActivate: function() {
systemError( "aboutToActivate" );
		return;

		if( this.itemEdited === true ) {

			this.itemEdited = false;

			if( typeof( this.cmdMenuModel['items'][0]['submenu'] ) !== "undefined" ) {

				this.runSearch();
			}
		}

		Mojo.Event.listen( this.controller.get( 'searchAccountRow' ), Mojo.Event.tap, this.selectCategoryEvent );
		Mojo.Event.listen( this.controller.get( 'searchCategoryRow' ), Mojo.Event.tap, this.selectAccountEvent );

		Mojo.Event.listen( this.controller.get( 'searchList' ), Mojo.Event.listTap, this.transactionTapHandlerEvent );
	},

	//Scene made visible
	activate: function() {
	},

	fetchTrsnSortMethods: function() {

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

	/** Handle Inputs **/
	handleCommand: function( event ) {

		if( event.type === Mojo.Event.back ) {

			if( this.autoSearch === true ) {

				this.controller.stageController.popScene();
				event.stop();
			} else if( typeof( this.cmdMenuModel['items'][2]['command'] ) !== "undefined" ) {

				if( this.cmdMenuModel['items'][2]['command'] === "search" ) {

					this.controller.stageController.popScene();
					event.stop();
				} else {

					//Change to Search Menu
					this.cmdMenuModel['items'][0] = {};
					this.cmdMenuModel['items'][2] = { icon:'search', command:'search' };
					this.controller.modelChanged( this.cmdMenuModel );
					event.stop();
				}
			}

		}

		if( event.type === Mojo.Event.command ) {

			if( event.command.indexOf( "SORT_COMMAND" ) !== -1 ) {

				this.sortMode = event.command.replace( "SORT_COMMAND", "" );

				this.resetScroll = true;
				this.startSpinner();

				this.runSearch();
			} else {

				switch( event.command ) {
					case 'search':
						//Change to View Menu
						this.cmdMenuModel['items'][0] = { icon:'sort', submenu:'sort-sub-menu' };
						this.cmdMenuModel['items'][2] = { icon:'back', command:'back' };
						this.controller.modelChanged( this.cmdMenuModel );

						this.runSearch();
						event.stop();
						break;
					case 'back':
						//Change to Search Menu
						this.cmdMenuModel['items'][0] = {};
						this.cmdMenuModel['items'][2] = { icon:'search', command:'search' };
						this.controller.modelChanged( this.cmdMenuModel );
						event.stop();
						break;
				}
			}
		}
	},

	runSearch: function() {

		var lengthQry = "SELECT COUNT( DISTINCT itemId ) as listLength FROM transactions exp WHERE " +
							( this.searchStringModel['value'] === "" ? "" : " ( desc LIKE '%" + this.searchStringModel['value'] + "%' OR note LIKE '%" + this.searchStringModel['value'] + "%' ) AND" ) +
							( this.clearedStatusModel['value'] === 2 ? "" : " cleared = " + this.clearedStatusModel['value'] + " AND" ) +

							( this.categoryModel == "" ? "" : " category = " + this.categoryModel + " AND" ) +
							( this.category2Model == "" ? "" : " category2 = " + this.category2Model + " AND" ) +

							( this.accountModel.length <= 0 ? "" : " account IN ( " + this.accountModel.join(",") + " ) AND" ) +

							" CAST( date AS INTEGER ) >= CAST( " + Date.parse( this.startDateModel['date'] ) + " AS INTEGER ) AND" +
							" CAST( date AS INTEGER ) <= CAST( " + Date.parse( this.endDateModel['date'] ) + " AS INTEGER );";

		accountsDB.transaction(
			(
				function( transaction ) {

					transaction.executeSql( lengthQry, [], this.runSearchHandler.bind( this ), this.sqlError.bind( lengthQry, this ) );
				}
			).bind( this ) );
	},

	runSearchHandler: function( transaction, results ) {

		this.listLength = results.rows.item(0)['listLength'];

		this.controller.get( 'searchList' ).mojo.setLengthAndInvalidate( this.listLength );

		this.controller.get( 'searchList' ).mojo.revealItem( 0, false );
		this.controller.get( 'searchList' ).mojo.revealItem.delay( 0.1, 0, false );

		if( this.systemActive() === true && this.listLength <= 0 ) {

			this.stopSpinner();
		}
	},

	runSearchCallback: function( listWidget, offset, count ) {

		var expenseSort = " date ASC";

		switch( this.sortMode ) {
			case "0":
				expenseSort = "date ASC, itemId ASC";
				break;
			case "1":
				expenseSort = "date DESC, itemId DESC";
				break;
			case "2":
				expenseSort = "desc COLLATE NOCASE ASC, itemId ASC";
				break;
			case "3":
				expenseSort = "desc COLLATE NOCASE DESC, itemId ASC";
				break;
			case "4":
				expenseSort = "amount ASC, itemId ASC";
				break;
			case "5":
				expenseSort = "amount DESC, itemId ASC";
				break;
			case "6":
				expenseSort = "cleared DESC, date ASC, itemId ASC";
				break;
			case "7":
				expenseSort = "cleared ASC, date DESC, itemId ASC";
				break;
		}

		accountsDB.transaction(
			(
				function( transaction ) {

					var categoryLimits = "";
					for( var i = 0; i < this.categoryModel.length; i++ ) {

						categoryLimits += " ( ex.category || '|' || ex.category2 ) LIKE '" + this.categoryModel[i] + "' OR";
					}

					if( this.categoryModel.length === 1 ) {

						categoryLimits = categoryLimits.substr( 0, ( categoryLimits.length - 3 ) ) + " AND";
					} else if( this.categoryModel.length > 1 ) {

						categoryLimits = "( " + categoryLimits + " ) AND";
					}

					var expenseQry = "SELECT DISTINCT itemId, *," +
										" ( SELECT acct.acctName FROM accounts acct WHERE acct.acctId = exp.account ) AS accountName," +
										" ( SELECT acct.atmEntry FROM accounts acct WHERE acct.acctId = exp.account ) AS atmEntry," +
										" ( SELECT acct.showTransTime FROM accounts acct WHERE acct.acctId = exp.account ) AS showTransTime," +
										" ( SELECT acct.checkField FROM accounts acct WHERE acct.acctId = exp.account ) AS checkField," +
										" ( SELECT acct.hideNotes FROM accounts acct WHERE acct.acctId = exp.account ) AS hideNotes," +
										" ( SELECT acct.enableCategories FROM accounts acct WHERE acct.acctId = exp.account ) AS enableCategories" +
										" FROM transactions exp WHERE " +
										( this.searchStringModel['value'] === "" ? "" : " ( desc LIKE '%" + this.searchStringModel['value'] + "%' OR note LIKE '%" + this.searchStringModel['value'] + "%' ) AND" ) +
										( this.clearedStatusModel['value'] === 2 ? "" : " cleared = " + this.clearedStatusModel['value'] + " AND" ) +
										( this.accountModel.length <= 0 ? "" : " account IN ( " + this.accountModel.join(",") + " ) AND" ) +
										categoryLimits +
										" CAST( date AS INTEGER ) >= CAST( " + Date.parse( this.startDateModel['date'] ) + " AS INTEGER ) AND" +
										" CAST( date AS INTEGER ) <= CAST( " + Date.parse( this.endDateModel['date'] ) + " AS INTEGER )" +
										" ORDER BY " + expenseSort + " LIMIT ? OFFSET ?;";

					transaction.executeSql( expenseQry, [ count, offset ], this.runSearchCallbackHandler.bind( this, offset, count ), this.sqlError.bind( expenseQry, this ) );
				}
			).bind( this ) );
	},

	runSearchCallbackHandler: function( offset, count, transaction, results ) {

		var dateObj;

		var transactionType = "";

		for( var i = 0; i < results.rows.length; i++ ) {

			var row = results.rows.item( i );

			var transferCheck = ( row['linkedRecord'] && !isNaN( row['linkedRecord'] ) && row['linkedRecord'] != "" );
			var repeatCheck = ( row['repeatId'] && !isNaN( row['repeatId'] ) && row['repeatId'] != "" );

			if( transferCheck === true && repeatCheck === true ) {
				//Transfer and Recurring

				transactionType = "<img src='./images/future_transfer.1.png' height='32' width='32' class='transactionTypeIcon' />";
			} else if( transferCheck === true && repeatCheck !== true ) {
				//Transfer Only

				transactionType = "<img src='./images/transfer.3.png' height='32' width='32' class='transactionTypeIcon' />";
			} else if( transferCheck !== true && repeatCheck === true ) {
				//Recurring Only

				transactionType = "<img src='./images/calendar.png' height='32' width='32' class='transactionTypeIcon' />";
			} else {

				transactionType = "";
			}

			//Create date item
			dateObj = new Date( parseInt( row['date'] ) );

			var today = new Date();

			if( row['showTransTime'] !== 1 ) {

				today.setHours( 23, 59, 59, 999 );
			}

			var amountColor = "";
			if( ( Math.round( row['amount'] * 100 ) / 100 ) < 0 ) {

				amountColor = 'negativeFunds';
			} else if( ( Math.round( row['amount'] * 100 ) / 100 ) > 0 ) {

				amountColor = 'positiveFunds';
			} else {

				amountColor = 'neutralFunds';
			}

			var dispCheckNum = ( row['checkField'] === 1 && row['checkNum'] && row['checkNum'] !== "" );

			this.transactionListModel['items'][( offset + i )] =
						{
							//Record items
							rowCount: ( offset + i ),

							//Account Data
							atmEntry: row['atmEntry'],
							showTransTime: row['showTransTime'],
							checkField: row['checkField'],
							hideNotes: row['hideNotes'],
							enableCategories: row['enableCategories'],
							accountName: row['accountName'],

							//Data
							id: "ID" + row['itemId'],
							descData: row['desc'],
							amountData: row['amount'],
							cleared: row['cleared'],
							note: row['note'],
							dateData: parseInt( row['date'] ),
							account: row['account'],
							category: row['category'],
							linkedRecord: row['linkedRecord'],
							linkedAccount: row['linkedAccount'],
							checkNum: row['checkNum'],

							//Repeating Item
							repeatId: row['repeatId'],
							repeatFrequency: row['repeatFrequency'],
							repeatDaysOfWeek: row['repeatDaysOfWeek'],
							repeatItemSpan: row['repeatItemSpan'],
							repeatEndingCondition: row['repeatEndingCondition'],
							repeatEndDate: row['repeatEndDate'],
							repeatEndCount: row['repeatEndCount'],
							repeatCurrCount: row['repeatCurrCount'],

							//Display Items
							amount: formatAmount( row['amount'] ),
							desc: stripHTML( row['desc'] ),
							date: formatDate( dateObj, {date: 'medium', time: ( row['showTransTime'] == 1 ? 'short' : '' ) } ),
							noteDisplay: ( row['hideNotes'] === 1 ? "" : formatNotes( row['note'] ) ),
							checkNumDisplay: ( dispCheckNum ? "Check #" + row['checkNum'] + "<br />" : "" ),
							runningBalance: "",
							catDisplay: ( row['enableCategories'] === 1 ? ( row['category'].replace( "|", " &raquo; " ) === "" ? "" : row['category'].replace( "|", " &raquo; " ) + "<br />" ) : "" ),

							//Formatting items
							amountColor: amountColor,
							balanceColor: "",
							transactionIcon: transactionType,
							altRow: ( ( i % 2 ) == 0 ? 'altRow' : 'normRow' ),
							futureTransaction: ( ( row['date'] <= Date.parse( today ) ) ? ' ' : 'futureTransaction' ),
							clearedTransaction: ( ( row['cleared'] === 0 ) ? '' : 'true' )
						};
		}

		this.controller.get( 'searchList' ).mojo.noticeUpdatedItems( offset, this.transactionListModel['items'].slice( offset, ( offset + count ) ) );

		if( this.listLength && typeof( this.listLength ) !== "undefined" ) {

			this.controller.get( 'searchList' ).mojo.setLength( this.listLength );
		} else {

			this.controller.get( 'searchList' ).mojo.setLength( this.transactionListModel['items'].length );
		}

		if( this.systemActive() === true ) {

			this.stopSpinner();
		}
	},

	/** List Item tapped **/
	transactionTapHandler: function( event ) {

		this.accountObject['atmEntry'] = event.item['atmEntry'];
		this.accountObject['showTransTime'] = event.item['showTransTime'];
		this.accountObject['checkField'] = event.item['checkField'];
		this.accountObject['hideNotes'] = event.item['hideNotes'];
		this.accountObject['enableCategories'] = event.item['enableCategories'];
		this.accountId = event.item['account'];

		//BROKEN DISABLED
		//this.controller.stageController.pushScene( "addEdit-transaction", this, 'EDIT_TRANSACTION', event.item['rowCount'] );
	},

	selectAccount: function( event ) {

		event.stop();

		this.controller.showDialog(
				{
					template: 'dialogs/multiselect-dialog',
					assistant: new multiSelectDialog( this, this.accountList, this.updateAccount.bind( this ) )
				}
			);
	},

	updateAccount: function( newList ) {
		//<div id="searchAccount" class="list-selector-value truncating-text">
	},

	selectCategory: function( event ) {

		event.stop();

		this.controller.showDialog(
				{
					template: 'dialogs/multiselect-dialog',
					assistant: new multiSelectDialog( this, this.categoryList, this.updateCategory.bind( this ) )
				}
			);
	},

	updateCategory: function( newList ) {
		//<div id="searchCategory" class="list-selector-value truncating-text">
	},

	startSpinner: function() {

		this.updateLoadingSystem( true, $L( "Searching Transactions" ), $L( "Please wait..." ), 0 );
	},

	stopSpinner: function() {

		var closeSpinner = function() {

				this.updateLoadingSystem( false, "", "", 0 );
			}.bind( this );

		var delaycloseSpinner = closeSpinner.delay( 0.5 );
	},

	deactivate: function( event ) {

		Mojo.Event.stopListening( this.controller.get( 'searchAccountRow' ), Mojo.Event.tap, this.selectCategoryEvent );
		Mojo.Event.stopListening( this.controller.get( 'searchCategoryRow' ), Mojo.Event.tap, this.selectAccountEvent );

		Mojo.Event.stopListening( this.controller.get( 'searchList' ), Mojo.Event.listTap, this.transactionTapHandlerEvent );
	},

	cleanup: function( event ) {
	}
} );

