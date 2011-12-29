/* Copyright 2009 and forward GlitchTech Science.  All rights reserved. */

var AccountCategoriesAssistant = Class.create( commonModel, {

	initialize: function( $super ) {

		$super();

		this.catListTapHandlerEvent = this.catListTapHandler.bindAsEventListener( this );
		this.catListDeleteHandlerEvent = this.catListDeleteHandler.bindAsEventListener( this );
		this.catListReorderHandlerEvent = this.catListReorderHandler.bindAsEventListener( this );

		this.searchFilterEvent = this.searchFilter.bindAsEventListener( this );
	},

	setup: function() {

		this.acctCatData = {
			items: new Array()
		};

		//False model data
		this.dataAttr = {
			itemTemplate: 'account-categories/acctCatItemTemplate',

			renderLimit: 70,
			lookahead: 20,
			itemsCallback: this.categoryListCallback.bind( this ),

			hasNoWidgets: true,
			swipeToDelete: true,
			autoconfirmDelete: false,
			reorderable: true
		};

		this.controller.setupWidget( 'acctCatList', this.dataAttr, this.acctCatData );

		this.filter = "";
		this.filterListWidget = null;
		this.filterOffset = 0;
		this.filterCount = 0;

		//False model data
		this.dataAttrFilter = {
			itemTemplate: 'account-categories/acctCatItemTemplate',

			renderLimit: 70,
			lookahead: 20,
			filterFunction: this.categoryListFilter.bind( this ),

			swipeToDelete: true,
			autoconfirmDelete: false,

			reorderable: false
		};

		this.controller.setupWidget( 'acctCatFilterList', this.dataAttrFilter, { items:[] } );

		this.setupLoadingSystem();

		/** New category button **/
		this.transactionCmdButtons = {
										visible: true,
										items: [
											{},
											{},
											{
												icon: 'new',
												command:"new"
											}
										]
									};

		this.controller.setupWidget( Mojo.Menu.commandMenu, undefined, this.transactionCmdButtons );

		var transactionMenuModel = {
							visible: true,
							items: [
								Mojo.Menu.editItem,
								appMenuPrefAccountsDisabled,
								appMenuFeaturesDisabled,
								cbAboutItem,
								cbHelpItem
							]
						};

		this.controller.setupWidget( Mojo.Menu.appMenu, appMenuOptions, transactionMenuModel );
	},

	ready: function() {

	},

	//500ms before activate
	aboutToActivate: function() {

		this.loadAcctCatData();
	},

	//Scene made visible
	activate: function( event ) {
		this.controller.get( 'acctCatHeader' ).update( $L( "Account Categories" ) );

		Mojo.Event.listen( this.controller.get( 'acctCatList' ), Mojo.Event.listTap, this.catListTapHandlerEvent );
		Mojo.Event.listen( this.controller.get( 'acctCatList' ), Mojo.Event.listDelete, this.catListDeleteHandlerEvent );
		Mojo.Event.listen( this.controller.get( 'acctCatList' ), Mojo.Event.listReorder, this.catListReorderHandlerEvent );

		Mojo.Event.listen( this.controller.get( 'acctCatFilterList' ), Mojo.Event.listTap, this.catListTapHandlerEvent );
		Mojo.Event.listen( this.controller.get( 'acctCatFilterList' ), Mojo.Event.listDelete, this.catListDeleteHandlerEvent );
		Mojo.Event.listen( this.controller.get( 'acctCatFilterList' ), Mojo.Event.filter, this.searchFilterEvent, true );
	},

	/** Get account categories **/
	loadAcctCatData: function() {

		this.startSpinner();

		accountsDB.transaction(
			(
				function( transaction ) {

					var acctCatQry = "SELECT COUNT( name ) AS itemCount FROM accountCategories";

					transaction.executeSql( acctCatQry, [], this.loadAcctCatDataHandler.bind( this ), this.fetchError.bind( this ) );
				}
			).bind( this ) );
	},

	loadAcctCatDataHandler: function( transaction, results ) {

		this.itemCount = results.rows.item(0)['itemCount'];

		this.controller.get( 'acctCatList' ).mojo.setLengthAndInvalidate( this.itemCount );

		if( this.systemActive() === true && this.itemCount <= 0 ) {

			this.stopSpinner();
		}
	},

	categoryListCallback: function( listWidget, offset, count ) {

		var acctCatQry = "SELECT rowid, * FROM accountCategories ORDER BY catOrder ASC LIMIT ? OFFSET ?;";

		accountsDB.transaction(
			(
				function( transaction ) {

					transaction.executeSql( acctCatQry, [ count, offset ], this.acctCatQryHandler.bind( this, offset, count ), this.fetchError.bind( this ) );
				}
			).bind( this ) );
	},

	acctCatQryHandler: function( offset, count, transaction, results ) {

		for( var i = 0; i < results.rows.length; i++ ) {

			var row = results.rows.item( i );

			this.acctCatData['items'][( offset + i )] =
						{
							i: ( offset + i ),
							rowId: row['rowid'],
							name: row['name'],
							icon: row['icon'],
							color: row['color'],
							catOrder: row['catOrder']
						};
		}

		this.controller.get( 'acctCatList' ).mojo.noticeUpdatedItems( offset, this.acctCatData['items'].slice( offset, ( offset + count ) ) );

		if( this.itemCount && typeof( this.itemCount ) !== "undefined" ) {

			this.controller.get( 'acctCatList' ).mojo.setLength( this.itemCount );
		} else {

			this.controller.get( 'acctCatList' ).mojo.setLength( this.acctCatData['items'].length );
		}

		if( this.systemActive() === true ) {

			this.stopSpinner();
		}
	},

	searchFilter: function( event ) {

		if( event.filterString !== "" ) {

			this.controller.get( "acctCatList" ).hide();
		} else {

			this.controller.get( "acctCatList" ).show();
			//this.loadAcctCatData();
		}
	},

	categoryListFilter: function( filterString, listWidget, offset, count ) {

		var subset = [];
		var totalSubsetSize = 0;

		this.filter = filterString;
		this.filterListWidget = listWidget;
		this.filterOffset = offset;
		this.filterCount = count;

		if( filterString !== "" ) {

			if( filterString !== "" ) {

				var items = [];

				var hasString = function( query, s ) {

					if( s.name.toUpperCase().indexOf( query.toUpperCase() ) >= 0 ) {

						return true;
					}

					return false;
				}
			}

			for( var i = 0; i < this.acctCatData['items'].length; i++ ) {

				if( hasString( filterString, this.acctCatData['items'][i] ) ) {

					var sty = this.acctCatData['items'][i];
					items.push( sty );
				}
			}

			this.entireList = items;

			var cursor = 0;
			while( true ) {

				if( cursor >= this.entireList.length ) {

					break;
				}

				if( subset.length < count && totalSubsetSize >= offset ) {

					this.entireList[ cursor ][i] = cursor;

					subset.push( this.entireList[ cursor ] );
				}

				totalSubsetSize++;
				cursor++;
			}
		}

		listWidget.mojo.noticeUpdatedItems( offset, subset );
		listWidget.mojo.setLength( totalSubsetSize );
		listWidget.mojo.setCount( totalSubsetSize );
	},
/*
	categoryListFilter: function( filterString, listWidget, offset, count ) {

		this.filter = filterString;
		this.filterListWidget = listWidget;
		this.filterOffset = offset;
		this.filterCount = count;

		var acctCatQry = "SELECT rowid, * FROM accountCategories WHERE name LIKE ? ORDER BY catOrder ASC LIMIT ? OFFSET ?;";

		accountsDB.transaction(
			(
				function( transaction ) {

					transaction.executeSql( acctCatQry, [ filter + "%", count, offset ], this.categoryListFilterHandler.bind( this ), this.fetchError.bind( this ) );
				}
			).bind( this ) );
	},

	categoryListFilterHandler: function( transaction, results ) {

		var items = [];

		for( var i = 0; i < results.rows.length; i++ ) {

			var row = results.rows.item( i );

			if( row['name'].toUpperCase().indexOf( this.filter.toUpperCase() ) >= 0 ) {

				items.push(
						{
							i: i,
							rowId: row['rowid'],
							name: row['name'],
							icon: row['icon'],
							catOrder: row['catOrder']
						}
					);
			}
		}

		this.filterListWidget.mojo.noticeUpdatedItems( this.filterOffset, items );
		this.filterListWidget.mojo.setLength( items.length );
		this.filterListWidget.mojo.setCount( items.length );
	},
*/

	/** Add Item **/
	handleCommand: function( event ) {

		if( event.type == Mojo.Event.command && event.command == "new" ) {

				this.controller.showDialog(
						{
							template: 'dialogs/accountCategory-dialog',
							assistant: new AddEditAccountCategoryDialog( this, this.dateTimeModel )
						}
					);
			event.stop();
		}
	},

	addAcctCat: function( itemName, itemIcon, itemColor ) {

		accountsDB.transaction(
			(
				function( transaction ) {

					//need to do max id

					transaction.executeSql( "INSERT INTO accountCategories( name, icon, color, catOrder ) VALUES( ?, ?, ?, ( SELECT IFNULL( MAX( catOrder ) + 1, 0 ) FROM accountCategories LIMIT 1 ) );", [ itemName, itemIcon, itemColor ], this.blankHandler.bind( this ), this.fetchError.bind( this ) );
				}
			).bind( this ) );

		//Insert item into array
		this.loadAcctCatData();
	},

	/** Edit Item **/
	catListTapHandler: function( event ) {

		this.controller.showDialog(
				{
					template: 'dialogs/accountCategory-dialog',
					assistant: new AddEditAccountCategoryDialog( this, event.item.i )
				}
			);
	},

	editAcctCat: function( itemId, i, oldName, itemName, itemIcon, itemColor ) {

		accountsDB.transaction(
			(
				function( transaction ) {

					transaction.executeSql( "UPDATE accountCategories SET name = ?, icon = ?, color = ? WHERE rowid = ?;", [ itemName, itemIcon, itemColor, itemId ], this.blankHandler.bind( this ), this.fetchError.bind( this ) );

					transaction.executeSql( "UPDATE accounts SET acctCategory = ? WHERE acctCategory = ?;", [ itemName, oldName ], this.blankHandler.bind( this ), this.fetchError.bind( this ) );
				}
			).bind( this ) );

		this.acctCatData['items'][i] =
					{
						i: i,
						rowId: itemId,
						name: itemName,
						icon: itemIcon,
						color: itemColor,
						catOrder: this.acctCatData['items'][i]['catOrder']
					};

		this.controller.get( 'acctCatList' ).mojo.noticeUpdatedItems( i, this.acctCatData['items'].slice( i, ( i + 1 ) ) );

		if( this.filter && this.filter !== "" ) {

			this.categoryListFilter( this.filter, this.filterListWidget, this.filterOffset, this.filterCount );
		}
	},

	/** Delete Item **/
	catListDeleteHandler: function( event ) {

		this.controller.get( 'acctCatList' ).mojo.noticeRemovedItems( event.item.i, 1 );
		this.acctCatData['items'][event.item.i] = null;

		accountsDB.transaction(
			(
				function( transaction ) {

					var qryAccountCategories = "DELETE FROM accountCategories WHERE rowid = ? AND name = ?;";

					transaction.executeSql( qryAccountCategories, [ event.item.rowId, event.item.name ], this.blankHandler.bind( this ), this.fetchError.bind( this ) );
				}
			).bind( this ) );

		event.stop();

		if( this.filter && this.filter !== "" ) {

			this.categoryListFilter( this.filter, this.filterListWidget, this.filterOffset, this.filterCount );
		}
	},

	/** Reorder List **/
	catListReorderHandler: function( event ) {

		this.acctCatData['items'].splice( event.fromIndex, 1 );
		this.acctCatData['items'].splice( event.toIndex, 0, event.item );

		accountsDB.transaction(
			(
				function( transaction ) {

					var start = ( event.fromIndex < event.toIndex ? event.fromIndex : event.toIndex );
					var end = ( event.fromIndex > event.toIndex ? event.fromIndex : event.toIndex );

					for( var i = start; i <= end; i++ ) {

						try {

							this.acctCatData['items'][i]['i'] = i;

							transaction.executeSql( "UPDATE accountCategories SET catOrder = ? WHERE rowid = ?;", [ i, this.acctCatData['items'][i]['rowId'] ], this.blankHandler.bind( this ), this.fetchError.bind( this ) );
						} catch( err ) {
							//in case of removed row
						}
					}
				}
			).bind( this ) );
	},

	blankHandler: function( transaction, results ) {
	},

	fetchError: function( transaction, error ) {

		systemError( "Account Cat Error: " + error.message + " (Code " + error.code + ")" );
	},

	startSpinner: function() {

		this.updateLoadingSystem( true, $L( "Loading Categories" ), $L( "Please wait..." ), 0 );
	},

	stopSpinner: function() {

		var closeSpinner = function() {

				this.updateLoadingSystem( false, "", "", 0 );
			}.bind( this );

		var delaycloseSpinner = closeSpinner.delay( 0.5 );
	},

	deactivate: function( event ) {

		Mojo.Event.stopListening( this.controller.get( 'acctCatList' ), Mojo.Event.listTap, this.catListTapHandlerEvent );
		Mojo.Event.stopListening( this.controller.get( 'acctCatList' ), Mojo.Event.listDelete, this.catListDeleteHandlerEvent );
		Mojo.Event.stopListening( this.controller.get( 'acctCatList' ), Mojo.Event.listReorder, this.catListReorderHandlerEvent );

		Mojo.Event.stopListening( this.controller.get( 'acctCatFilterList' ), Mojo.Event.listTap, this.catListTapHandlerEvent );
		Mojo.Event.stopListening( this.controller.get( 'acctCatFilterList' ), Mojo.Event.listDelete, this.catListDeleteHandlerEvent );
		Mojo.Event.stopListening( this.controller.get( 'acctCatFilterList' ), Mojo.Event.filter, this.searchFilterEvent, true );
	},

	cleanup: function( event ) {
	}
} );
