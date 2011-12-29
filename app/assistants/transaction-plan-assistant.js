/* Copyright 2009 and forward GlitchTech Science. All rights reserved. */

var TransactionPlanAssistant = Class.create( commonModel, {

	initialize: function( $super ) {

		$super();

		var currDate = new Date();

		//Month 1st  at 12:00:00am
		currDate.setDate( 1 );
		this.planStart = Date.parse( currDate.toDateString() + " 00:00:00" );

		//Month Last at 11:59:59pm
		currDate.setDate( daysInMonth( currDate.getMonth(), currDate.getFullYear() ) );
		this.planEnd = Date.parse( currDate.toDateString() + " 23:59:59" );

		this.categoryData = [];

		this.budgetModel = {
				items: [],
				totalSpent: 0,
				totalBudgeted: 0
			};

		this.multiplier = 1;

		this.planListTapHandlerEvent = this.planListTapHandler.bindAsEventListener( this );
		this.planListDeleteHandlerEvent = this.planListDeleteHandler.bindAsEventListener( this );
		this.planListReorderHandlerEvent = this.planListReorderHandler.bindAsEventListener( this );
	},

	setup: function() {

		this.controller.setupWidget(
					"total-budget-bar",
					{},
					this.totalBudget = {
						value: 0
					}
				);

		//Budget List
		this.planAttr = {
			renderLimit:30,
			lookahead:15,
			itemsCallback:this.budgetCallback.bind( this ),

			itemTemplate:'transaction-plan/transactionPlanTemplate',
			emptyTemplate:'transaction-plan/planSimpleGuide',

			swipeToDelete: true,
			autoconfirmDelete: false,

			reorderable: true
		};

		this.controller.setupWidget( 'planList', this.planAttr, this.budgetModel );
		this.controller.setupWidget( 'budget-status-bar', {} );

		this.sortOptionsModel = {
				items: [
					{
						label: $L( "Custom (Default)" ),
						command: "SORT_COMMAND" + "0",
						query: "budgetOrder ASC, "
					}, {
						label: $L( "Alphabetical" ),
						command: "SORT_COMMAND" + "1",
						query: ""
					}, {
						label: $L( "Budget Remaining (Asc)" ),
						command: "SORT_COMMAND" + "2",
						query: "( spent / spending_limit ) ASC, "
					}, {
						label: $L( "Budget Remaining (Desc)" ),
						command: "SORT_COMMAND" + "3",
						query: "( spent / spending_limit ) DESC, "
					}
				]
			};
		this.sortCommand = 0;

		this.controller.setupWidget( 'sort-sub-menu', null, this.sortOptionsModel );

		this.budgetCommandButtons = {
										visible: true,
										items: [
											{
												icon:'sort',
												submenu: 'sort-sub-menu'
											},
											{
												icon:'back',
												command:'dateSetBack'
											},
											{
												items: [
													{
														icon: 'new',
														command: 'new'
													}, {
														icon: 'lock',
														command: 'lock'
													}
												]
											},
											{
												icon:'forward',
												command:'dateSetForward'
											},
											{
												icon: 'search',
												command: 'refineBudget'
											}
										]
									};

		this.controller.setupWidget( Mojo.Menu.commandMenu, undefined, this.budgetCommandButtons );

		//App Menu
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

		this.setupLoadingSystem();
	},

	ready: function() {
	},

	//500ms before activate
	aboutToActivate: function() {

		this.fetchBudget();
		//Change to list callback like transactions scene
	},

	//Scene made visible
	activate: function() {

		Mojo.Event.listen( this.controller.get( 'planList' ), Mojo.Event.listTap, this.planListTapHandlerEvent );
		Mojo.Event.listen( this.controller.get( 'planList' ), Mojo.Event.listDelete, this.planListDeleteHandlerEvent );
		Mojo.Event.listen( this.controller.get( 'planList' ), Mojo.Event.listReorder, this.planListReorderHandlerEvent );
	},

	fetchBudget: function() {
		//Get count of all items and update budget header

		this.startSpinner()

		accountsDB.transaction(
			(
				function( transaction ) {

					var qryCount = "SELECT" +
									" COUNT( budgetId ) AS budgetCount," +
									" IFNULL(" +
										" SUM( spending_limit ), 0" +
									" ) AS spending_limit," +
									" IFNULL(" +
										" SUM( ( SELECT ABS( SUM( ex.amount ) )" +
										" FROM transactions ex" +
										" WHERE ex.category LIKE budgets.category AND CAST( date AS INTEGER ) >= ? AND CAST( date AS INTEGER ) <= ? ) ), 0" +
									" ) AS spent" +
									" FROM budgets;";

					transaction.executeSql( qryCount, [ this.planStart, this.planEnd ], this.budgetHandler.bind( this ), this.fetchError.bind( this, qryCount ) );
				}
			).bind( this ) );
	},

	budgetHandler: function( transaction, results ) {

		//Setup Multiplier
		var currDate = new Date();

		currDate.setDate( 1 );
		var monthStart = Date.parse( currDate.toDateString() + " 00:00:00" );

		currDate.setDate( daysInMonth( currDate.getMonth(), currDate.getFullYear() ) );
		var monthEnd = Date.parse( currDate.toDateString() + " 23:59:59" );

		this.multiplier = 1;

		if( !( this.planStart === monthStart && this.planEnd === monthEnd ) ) {

			var monthStart = new Date( this.planStart );
			var monthEnd = new Date( this.planEnd );

			monthStart.setDate( 15 );

			while( ( monthStart.getMonth() !== monthEnd.getMonth() || monthStart.getFullYear() !== monthEnd.getFullYear() ) && monthStart < monthEnd ){

				monthStart.setMonth( monthStart.getMonth() + 1 );
				this.multiplier++;
			}
		}

		//Setup List System
		this.budgetLength = results.rows.item(0)['budgetCount'];
		var totalBudget = this.multiplier * results.rows.item(0)['spending_limit'];
		var totalSpent = results.rows.item(0)['spent'];

		this.controller.get( 'planList' ).mojo.setLengthAndInvalidate( this.budgetLength );

		this.controller.get( 'planList' ).mojo.revealItem( 0, false );
		this.controller.get( 'planList' ).mojo.revealItem.delay( 0.1, 0, false );

		//Setup Header
		this.updateHeader( totalSpent, totalBudget, $L( "Budget" ), ( formatDate( new Date( this.planStart ), { date: "medium", time: "" } ) + " to " + formatDate( new Date( this.planEnd ), { date: "medium", time: "" } ) ) );

		if( this.systemActive() === true && this.budgetLength <= 0 ) {

			this.stopSpinner();
		}
	},

	budgetCallback: function( listWidget, offset, count ) {

		var qryCount = "SELECT *, IFNULL( ( SELECT ABS( SUM( ex.amount ) ) FROM transactions ex WHERE ex.category LIKE budgets.category AND ex.category2 LIKE budgets.category2 AND CAST( date AS INTEGER ) >= ? AND CAST( date AS INTEGER ) <= ? ), 0 ) AS spent FROM budgets ORDER BY " + this.sortOptionsModel['items'][this.sortCommand]['query'] + "category LIMIT ? OFFSET ?;"

		accountsDB.transaction(
			(
				function( transaction ) {

					transaction.executeSql(
								qryCount,
								[ this.planStart, this.planEnd, count, offset ],
								this.budgetCallbackHandler.bind( this, offset, count ),
								this.fetchError.bind( this, qryCount )
							);
				}
			).bind( this ) );
	},

	budgetCallbackHandler: function( offset, count, transaction, results ) {

		for( var i = 0; i < results.rows.length; i++ ) {

			var row = results.rows.item( i );

			var limitAmount = this.multiplier * row['spending_limit'];

			var remaining = limitAmount - row['spent'];

			var budgetStatus = "positiveFunds";
			var budgetBar = "green";

			if( row['spent'] > limitAmount ) {

				budgetStatus = "negativeFunds";
				budgetBar = "red";
			} else if( row['spent'] >= ( 0.9 * limitAmount ) ) {

				budgetStatus = "equalFunds";
				budgetBar = "yellow";
			}

			var budgetLeft = ( row['spent'] / limitAmount );

			if( budgetLeft > 1 ) {

				budgetLeft = 1;
			}

			this.budgetModel['items'][( offset + i )] =
						{
							i: i,
							altRow: ( ( i % 2 ) == 0 ? 'altRow' : 'normRow' ),

							current: formatAmount( row['spent'] ),
							limit: formatAmount( limitAmount ),
							remaining: formatAmount( Math.abs( remaining ) ) + ( ( ( Math.round( remaining * 100 ) / 100 ) < 0 ) ? " over" : " left" ),
							categoryDisp: this.formatCategoryDisplay( row['category'], row['category2'] ),

							currentStatus: budgetStatus,

							value: budgetLeft,
							status: budgetBar,

							budgetId: row['budgetId'],
							category: row['category'],
							category2: row['category2'],
							current_amount: row['spent'],
							spending_limit: limitAmount,
							single_limit: row['spending_limit'],
							span: row['span'],
							rollOver: row['rollOver'],
							budgetOrder: row['budgetOrder']
						};
		}

		this.controller.get( 'planList' ).mojo.noticeUpdatedItems( offset, this.budgetModel['items'].slice( offset, ( offset + count ) ) );

		if( this.budgetLength && typeof( this.budgetLength ) !== "undefined" ) {

			this.controller.get( 'planList' ).mojo.setLength( this.budgetLength );
		} else {

			this.controller.get( 'planList' ).mojo.setLength( this.budgetModel['items'].length );
		}

		if( this.systemActive() ) {

			this.updateLoadingSystem( false, "", "", 0 );
		}
	},

	formatCategoryDisplay: function( genCat, specCat ) {

		if( specCat.indexOf( "%" ) !== -1 ) {

			return "<strong>" + genCat + "</strong>";
		} else {

			return genCat + ": <strong>" + specCat + "</strong>";
		}
	},

	updateHeader: function( spent, total, title, note ) {

		if( typeof( spent ) !== "undefined" && spent !== "" ) {

			this.budgetModel['totalSpent'] = spent;
		}

		if( typeof( total ) !== "undefined" && total !== "" ) {

			this.budgetModel['totalBudgeted'] = total;
		}

		var budgetStatus = "positiveBalanceLight";
		var budgetBar = "green";

		if( this.budgetModel['totalBudgeted'] === 0 && this.budgetModel['totalSpent'] === 0 ) {

			budgetStatus = "";
		} else if( this.budgetModel['totalSpent'] > this.budgetModel['totalBudgeted'] ) {

			budgetStatus = "negativeBalanceLight";
			budgetBar = "red";
		} else if( this.budgetModel['totalSpent'] >= ( 0.9 * this.budgetModel['totalBudgeted'] ) ) {

			budgetStatus = "equalBalanceLight";
			budgetBar = "yellow";
		}

		this.totalBudget.value = this.budgetModel['totalSpent'] / this.budgetModel['totalBudgeted'];

		if( this.totalBudget.value >= 1 ) {

			this.totalBudget.value = 1;
		} else if( this.totalBudget.value <= 0 || ( this.budgetModel['totalBudgeted'] === 0 && this.budgetModel['totalSpent'] === 0 ) ) {

			this.totalBudget.value = 0;
		}

		if( typeof( title ) !== "undefined" ) {

			this.controller.get( 'budget-header-text' ).update( title );
		}

		if( typeof( note ) !== "undefined" ) {

			this.controller.get( 'budget-filter-text' ).update( note );
		}

		this.controller.get( 'budget-status-text' ).update( "<span class='" + budgetStatus + "'>" + formatAmount( this.budgetModel['totalSpent'] ) + "</span><em>" + $L( " of " ) + "</em>" + formatAmount( this.budgetModel['totalBudgeted'] ) );

		this.controller.get( 'total-budget-bar' ).className = "plan-prog-bar " + budgetBar;
		this.controller.modelChanged( this.totalBudget );
	},

	handleCommand: function( event ) {

		if( event.type === Mojo.Event.back ) {

			var monthStart = new Date();
			var monthEnd = new Date();
			monthStart.setDate( 1 );
			monthEnd.setDate( daysInMonth( monthEnd.getMonth(), monthEnd.getFullYear() ) );

			if( this.planStart === Date.parse( monthStart.toDateString() + " 00:00:00" ) && this.planEnd === Date.parse( monthEnd.toDateString() + " 23:59:59" ) ) {

				this.controller.stageController.popScene();
			} else {

				this.planStart = Date.parse( monthStart.toDateString() + " 00:00:00" );
				this.planEnd = Date.parse( monthEnd.toDateString() + " 23:59:59" );

				this.startSpinner();
				this.fetchBudget();
			}
			event.stop();
		}

		if( event.type === Mojo.Event.command ) {

			if( event.command.indexOf( "SORT_COMMAND" ) !== -1 ) {

				this.sortCommand = parseInt( event.command.replace( "SORT_COMMAND", "" ) );

				this.startSpinner();
				this.fetchBudget();
				event.stop();
			} else if( event.command === "new" ) {

				this.controller.stageController.pushScene( "addEdit-budget", this, null );
				event.stop();
			} else if( event.command === "refineBudget" ) {

				this.controller.showDialog(
						{
							template: 'dialogs/transaction-plan-span-dialog',
							assistant: new transactionPlanSpanDialog( this )
						}
					);

				event.stop();
			} else if( event.command === "lock" ) {

				this.budgetCommandButtons['items'][2]['items'][1]['icon'] = ( this.budgetCommandButtons['items'][2]['items'][1]['icon'] === 'unlock' ? 'lock' : 'unlock' );

				this.controller.modelChanged( this.budgetCommandButtons );
				event.stop();
			} else if( event.command === "dateSetBack" ) {

				this.planStart = new Date( this.planStart );
				this.planStart.setMonth( this.planStart.getMonth() - 1 );
				this.planStart = Date.parse( this.planStart.toDateString() + " 00:00:00" );

				this.planEnd = new Date( this.planEnd );
				this.planEnd.setDate( 2 );
				this.planEnd.setMonth( this.planEnd.getMonth() - 1 );
				this.planEnd.setDate( daysInMonth( this.planEnd.getMonth(), this.planEnd.getFullYear() ) );
				this.planEnd = Date.parse( this.planEnd.toDateString() + " 23:59:59" );

				this.startSpinner();
				this.fetchBudget();
				event.stop();
			} else if( event.command === "dateSetForward" ) {

				this.planStart = new Date( this.planStart );
				this.planStart.setMonth( this.planStart.getMonth() + 1 );
				this.planStart = Date.parse( this.planStart.toDateString() + " 00:00:00" );

				this.planEnd = new Date( this.planEnd );
				this.planEnd.setDate( 2 );
				this.planEnd.setMonth( this.planEnd.getMonth() + 1 );
				this.planEnd.setDate( daysInMonth( this.planEnd.getMonth(), this.planEnd.getFullYear() ) );
				this.planEnd = Date.parse( this.planEnd.toDateString() + " 23:59:59" );

				this.startSpinner();
				this.fetchBudget();
				event.stop();
			}
		}
	},

	planListAddItem: function( itemObj ) {

		accountsDB.transaction(
			(
				function( transaction ) {

					var insertQry = "INSERT INTO budgets( category, category2, spending_limit, span, rollOver, budgetOrder ) VALUES( ?, ?, ?, ?, ?, ( SELECT IFNULL( MAX( budgetOrder ) + 1, 0 ) FROM budgets LIMIT 1 ) );";

					transaction.executeSql( insertQry, [ itemObj['category'], itemObj['category2'], itemObj['spending_limit'], itemObj['span'], itemObj['rollOver'] ], this.blankHandler.bind( this ), this.fetchError.bind( this, insertQry ) );
				}
			).bind( this ) );

		this.fetchBudget();
	},

	/** Edit Item **/
	planListTapHandler: function( event ) {

		if( this.budgetCommandButtons['items'][2]['items'][1]['icon'] === 'unlock' ) {

			this.controller.stageController.pushScene( "addEdit-budget", this, event.item );
		} else {

			var searchArguments = {
					string: "",
					cleared: 2,
					startDate: new Date( this.planStart ),
					stopDate: new Date( this.planEnd ),
					category: event.item.category,
					category2: event.item.category2,
					accounts: []
				};

			this.controller.stageController.pushScene( "search-transactions", searchArguments, true );
		}

		event.stop();
	},

	planListEditItem: function( itemObj ) {

		accountsDB.transaction(
			(
				function( transaction ) {

					var updateQry = "UPDATE budgets SET category = ?, category2 = ?, spending_limit = ?, span = ?, rollOver = ? WHERE budgetId = ?;";

					transaction.executeSql( updateQry, [ itemObj['category'], itemObj['category2'], itemObj['spending_limit'], itemObj['span'], itemObj['rollOver'], itemObj['budgetId'] ], this.blankHandler.bind( this ), this.fetchError.bind( this, updateQry ) );
				}
			).bind( this ) );

		this.fetchBudget();
	},

	/** Delete Item **/
	planListDeleteHandler: function( event ) {

		//Update Header
		this.budgetModel['totalSpent'] -= event.item['current_amount'];
		this.budgetModel['totalBudgeted'] -= event.item['spending_limit'];

		this.updateHeader( this.budgetModel['totalSpent'], this.budgetModel['totalBudgeted'] );

		//Remove Item from system
		this.controller.get( 'planList' ).mojo.noticeRemovedItems( event.item.i, 1 );
		this.budgetModel['items'].splice( event.item.i, 1 );

		this.updateItemIndex( event.item.i );

		if( this.budgetModel['items'].length <= 0 ) {

			this.controller.get( 'planList' ).mojo.setLength( 0 );
			this.controller.get( 'planList' ).mojo.noticeUpdatedItems( 0, [] );
		}

		accountsDB.transaction(
			(
				function( transaction ) {

					var deleteQry = "DELETE FROM budgets WHERE budgetId = ?;";

					transaction.executeSql( deleteQry, [ event.item.budgetId ], this.blankHandler.bind( this ), this.fetchError.bind( this, deleteQry ) );
				}
			).bind( this ) );

		event.stop();
	},

	/** Reorder List **/
	planListReorderHandler: function( event ) {

		this.budgetModel['items'].splice( event.fromIndex, 1 );
		this.budgetModel['items'].splice( event.toIndex, 0, event.item );

		var start = ( event.fromIndex < event.toIndex ? event.fromIndex : event.toIndex );
		var end = ( event.fromIndex > event.toIndex ? event.fromIndex : event.toIndex );

		this.updateItemIndex( start );

		accountsDB.transaction(
			(
				function( transaction ) {

					var reorderQry = "UPDATE budgets SET budgetOrder = ? WHERE budgetId = ?;";

					for( var i = start; i <= end; i++ ) {

						transaction.executeSql( reorderQry, [ i, this.budgetModel['items'][i]['budgetId'] ], this.blankHandler.bind( this ), this.fetchError.bind( this, reorderQry ) );
					}
				}
			).bind( this ) );
	},

	updateItemIndex: function( startIndex ) {

		var endIndex = this.budgetModel['items'].length;

		if( endIndex - startIndex > 25 ) {

			endIndex = startIndex + 25;
		}

		for( var i = startIndex; i < endIndex; i++ ) {

			this.budgetModel['items'][i]['i'] = i;
			this.budgetModel['items'][i]['altRow'] = ( ( i % 2 ) === 0 ? 'altRow' : 'normRow' );
		}

		if( endIndex < this.budgetModel['items'].length ) {

			this.updateItemIndex( endIndex );
		}
	},

	blankHandler: function( transaction, result ) {
	},

	fetchError: function( qry, transaction, error ) {

		systemError( "Transaction Plan Error: " + error.message + " (Code " + error.code + ") [" + qry + "]" );
	},

	startSpinner: function() {

		this.updateLoadingSystem( true, $L( "Retrieving Transactions" ), $L( "Building budget view..." ), 0 );
	},

	stopSpinner: function() {

		this.updateLoadingSystem( false, "", "", 0 );
	},

	deactivate: function( event ) {

		Mojo.Event.stopListening( this.controller.get( 'planList' ), Mojo.Event.listTap, this.planListTapHandlerEvent );
		Mojo.Event.stopListening( this.controller.get( 'planList' ), Mojo.Event.listDelete, this.planListDeleteHandlerEvent );
		Mojo.Event.stopListening( this.controller.get( 'planList' ), Mojo.Event.listReorder, this.planListReorderHandlerEvent );
	},

	cleanup: function( event ){
	}
} );
