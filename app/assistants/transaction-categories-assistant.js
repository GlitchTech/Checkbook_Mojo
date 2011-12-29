/* Copyright 2009 and forward GlitchTech Science.  All rights reserved. */

var TransactionCategoriesAssistant = Class.create( commonModel, {

	initialize: function( $super ) {

		$super();

		this.catListTapHandlerEvent = this.catListTapHandler.bindAsEventListener( this );
		this.catListDeleteHandlerEvent = this.catListDeleteHandler.bindAsEventListener( this );
		this.searchFilterEvent = this.searchFilter.bindAsEventListener( this );
	},

	setup: function() {

		this.catData = {
			items: new Array()
		};

		this.dataAttr = {
			itemTemplate: 'transaction-categories/catItemTemplate',
			dividerTemplate:'transaction-categories/genCatDivTemplate',
			dividerFunction: this.catDivFunct.bind( this ),

			renderLimit: 70,
			lookahead: 20,
			itemsCallback: this.categoryListCallback.bind( this ),

			swipeToDelete: true,
			autoconfirmDelete: false,

			reorderable: false
		};

		this.controller.setupWidget( 'trsnCatList', this.dataAttr, this.catData );

		this.filter = "";
		this.filterListWidget = null;
		this.filterOffset = 0;
		this.filterCount = 0;

		this.dataAttrFilter = {
			itemTemplate: 'transaction-categories/catItemTemplate',
			dividerTemplate:'transaction-categories/genCatDivTemplate',
			dividerFunction: this.catDivFunct.bind( this ),

			renderLimit: 70,
			lookahead: 20,
			filterFunction: this.categoryListFilter.bind( this ),

			swipeToDelete: true,
			autoconfirmDelete: false,

			reorderable: false
		};

		this.controller.setupWidget( 'trsnCatFilterList', this.dataAttrFilter, { items:[] } );

		this.setupLoadingSystem();

		this.cmdMenuModel = {
								visible: true,
								items: [
									{},
									{},
									{
										icon: 'new',
										command: 'new'
									}
								] };

		this.controller.setupWidget( Mojo.Menu.commandMenu, undefined, this.cmdMenuModel );

		var transactionMenuModel = {
							visible: true,
							items: [
								Mojo.Menu.editItem,
								appMenuPrefAccountsDisabled,
								appMenuFeaturesDisabled,
								{
									label: $L( "Recover Original Categories" ),
									command: "restoreTransCats"
								},
								cbAboutItem,
								cbHelpItem
							]
						};

		this.controller.setupWidget( Mojo.Menu.appMenu, appMenuOptions, transactionMenuModel );
	},

	ready: function() {

		this.controller.get( 'trsn-cat-header' ).update( $L( "Transaction Categories" ) );
	},

	aboutToActivate: function() {

		this.startSpinner();

		this.loadTrsnCatData();
	},

	activate: function() {

		Mojo.Event.listen( this.controller.get( 'trsnCatList' ), Mojo.Event.listDelete, this.catListDeleteHandlerEvent );
		Mojo.Event.listen( this.controller.get( 'trsnCatList' ), Mojo.Event.listTap, this.catListTapHandlerEvent );

		Mojo.Event.listen( this.controller.get( 'trsnCatFilterList' ), Mojo.Event.listDelete, this.catListDeleteHandlerEvent );
		Mojo.Event.listen( this.controller.get( 'trsnCatFilterList' ), Mojo.Event.listTap, this.catListTapHandlerEvent );
		Mojo.Event.listen( this.controller.get( 'trsnCatFilterList' ), Mojo.Event.filter, this.searchFilterEvent, true );
	},

	loadTrsnCatData: function() {

		accountsDB.transaction(
			(
				function( transaction ) {

					var trsnCatQry = "SELECT COUNT( specCat ) AS itemCount FROM transactionCategories";

					transaction.executeSql( trsnCatQry, [], this.loadTrsnCatDataHandler.bind( this ), this.fetchError.bind( this ) );

					var trsnCatQry = "SELECT DISTINCT genCat FROM transactionCategories";

					transaction.executeSql( trsnCatQry, [], this.buildGenCatList.bind( this ), this.fetchError.bind( this ) );
				}
			).bind( this ) );
	},

	loadTrsnCatDataHandler: function( transaction, results ) {

		this.itemCount = results.rows.item(0)['itemCount'];

		this.controller.get( 'trsnCatList' ).mojo.setLengthAndInvalidate( this.itemCount );

		if( this.systemActive() === true && this.itemCount <= 0 ) {

			this.stopSpinner();
		}
	},

	buildGenCatList: function( transaction, results ) {

		this.genCatData = [];

		for( var i = 0; i < results.rows.length; i++ ) {

			var row = results.rows.item( i );

			this.genCatData.push(
						{
							label: row['genCat'],
							value: row['genCat']
						}
					);
		}
	},

	categoryListCallback: function( listWidget, offset, count ) {

		var catQuery = "SELECT * FROM transactionCategories ORDER BY genCat, specCat LIMIT ? OFFSET ?;";

		accountsDB.transaction(
			(
				function( transaction ) {

					transaction.executeSql( catQuery, [ count, offset ], this.categoryDataHandler.bind( this, offset, count ), this.fetchError.bind( this, this.accountQry ) );
				}
			).bind( this ) );
	},

	categoryDataHandler: function( offset, count, transaction, results ) {

		for( var i = 0; i < results.rows.length; i++ ) {

			var row = results.rows.item( i );

			this.catData['items'][( offset + i )] =
						{
							i: ( offset + i ),

							genCat: row['genCat'],
							genCatId: row['genCat'].replace( " ", "" ),

							specCat: row['specCat'],
							specCatId: row['catId']
						};
		}

		this.controller.get( 'trsnCatList' ).mojo.noticeUpdatedItems( offset, this.catData['items'].slice( offset, ( offset + count ) ) );

		if( this.itemCount && typeof( this.itemCount ) !== "undefined" ) {

			this.controller.get( 'trsnCatList' ).mojo.setLength( this.itemCount );
		} else {

			this.controller.get( 'trsnCatList' ).mojo.setLength( this.catData['items'].length );
		}

		if( this.filter && this.filter !== "" ) {

			this.categoryListFilter( this.filter, this.filterListWidget, this.filterOffset, this.filterCount );
		}

		if( this.systemActive() === true ) {

			this.stopSpinner();
		}
	},

	catDivFunct: function( itemModel ) {

		return itemModel.genCat;
	},

	searchFilter: function( event ) {

		if (event.filterString !== "") {

			$( "trsnCatList" ).hide();
		} else {

			$( "trsnCatList" ).show();
		}
	},

	categoryListFilter: function( filterString, listWidget, offset, count ) {
		//Should change to db query

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

					if( s.genCat.toUpperCase().indexOf( query.toUpperCase() ) >= 0 || s.specCat.toUpperCase().indexOf( query.toUpperCase() ) >= 0 ) {

						return true;
					}

					return false;
				}
			};

			for( var i = 0; i < this.catData['items'].length; i++ ) {

				if( hasString( filterString, this.catData['items'][i] ) ) {

					var sty = this.catData['items'][i];
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

	/** Add Item **/
	handleCommand: function( event ) {

		if( event.type == Mojo.Event.command && event.command === "new" ) {

			this.controller.showDialog(
					{
						template: 'dialogs/transactionCategory-dialog',
						assistant: new AddEditTransactionCategoryDialog( this )
					}
				);
			event.stop();
		} else if( event.type == Mojo.Event.command && event.command === "restoreTransCats" ) {

			event.stop();

			this.startSpinner();

			accountsDB.transaction(
				(
					function( transaction ) {

						//Delete base items
						var qryDeleteCategories = "DELETE FROM transactionCategories;";

						transaction.executeSql( qryDeleteCategories, [], function() {}.bind( this ), this.fetchError.bind( this ) );

						//Insert base items
						var qryInsertCategories = "INSERT INTO transactionCategories( genCat, specCat ) VALUES( ?, ? );";

						for( var i = 1; i < oriTransCat.length; i++ ) {

							transaction.executeSql( qryInsertCategories, [ $L( oriTransCat[i]['genCat'] ), $L( oriTransCat[i]['specCat'] ) ], function() {}.bind( this ), this.fetchError.bind( this ) );
						}

						transaction.executeSql(
										qryInsertCategories,
										[
											$L( oriTransCat[0]['genCat'] ),
											$L( oriTransCat[0]['specCat'] )
										],
										function() {

											this.loadTrsnCatData();
										}.bind( this ),
										this.fetchError.bind( this )
									);
					}
				).bind( this ) );
		}
	},

	addTrsnCat: function( genCat, specCat ) {

		accountsDB.transaction(
			(
				function( transaction ) {

					transaction.executeSql( "INSERT INTO transactionCategories( genCat, specCat ) VALUES( ?, ? );", [ genCat, specCat ], this.blankHandler.bind( this ), this.fetchError.bind( this ) );
				}
			).bind( this ) );

		//Insert item into array
		this.loadTrsnCatData();
	},

	/** Edit Item **/
	catListTapHandler: function( event ) {

		this.controller.showDialog(
				{
					template: 'dialogs/transactionCategory-dialog',
					assistant: new AddEditTransactionCategoryDialog( this, event.item.i )
				}
			);

		event.stop();
	},

	editTrsnCat: function( i, catId, genCat, specCat ) {

		accountsDB.transaction(
			(
				function( transaction ) {

					transaction.executeSql( "UPDATE transactionCategories SET genCat = ?, specCat = ? WHERE catId = ?;", [ genCat, specCat, catId ], this.blankHandler.bind( this ), this.fetchError.bind( this ) );

					var oldName = this.catData['items'][i]['genCat'] + "" + this.catData['items'][i]['specCat'];
					var newName = genCat + "|" + specCat;

					transaction.executeSql( "UPDATE transactions SET category = ? WHERE category = ?;", [ newName, oldName ], this.blankHandler.bind( this ), this.fetchError.bind( this ) );

					transaction.executeSql( "UPDATE transactionSplit SET genCat = ?, specCat = ? WHERE genCat = ? AND specCat = ?;", [ genCat, specCat, this.catData['items'][i]['genCat'], this.catData['items'][i]['specCat'] ], this.blankHandler.bind( this ), this.fetchError.bind( this ) );
				}
			).bind( this ) );

		this.catData['items'][i] =
					{
						i: i,

						genCat: genCat,
						genCatId: genCat.replace( " ", "" ),

						specCat: specCat,
						specCatId: catId
					};

		this.controller.get( 'trsnCatList' ).mojo.noticeUpdatedItems( i, this.catData['items'].slice( i, ( i + 1 ) ) );

		if( this.filter && this.filter !== "" ) {

			this.categoryListFilter( this.filter, this.filterListWidget, this.filterOffset, this.filterCount );
		}
	},

	/** Delete Item **/
	catListDeleteHandler: function( event ) {

		this.catData['items'][event.item.i] = null;

		this.controller.get( 'trsnCatList' ).mojo.noticeRemovedItems( event.item.i, 1 );

		accountsDB.transaction(
			(
				function( transaction ) {

					var qryAccountCategories = "DELETE FROM transactionCategories WHERE catId = ? AND genCat = ? AND specCat = ?;";

					transaction.executeSql( qryAccountCategories, [ event.item.specCatId, event.item.genCat, event.item.specCat ], this.blankHandler.bind( this ), this.fetchError.bind( this ) );
				}
			).bind( this ) );

		event.stop();

		this.loadTrsnCatData();//Causes lag
		if( this.filter && this.filter !== "" ) {

			this.categoryListFilter( this.filter, this.filterListWidget, this.filterOffset, this.filterCount );
		}
	},

	blankHandler: function( transaction, result ) {},

	fetchError: function( transaction, error ) {

		systemError( 'Transaction Cat Fetch Error: ' + error.message + ' (Code ' + error.code + ')' );
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

	deactivate: function() {

		Mojo.Event.stopListening( this.controller.get( 'trsnCatList' ), Mojo.Event.listDelete, this.catListDeleteHandlerEvent );
		Mojo.Event.stopListening( this.controller.get( 'trsnCatList' ), Mojo.Event.listTap, this.catListTapHandlerEvent );

		Mojo.Event.stopListening( this.controller.get( 'trsnCatFilterList' ), Mojo.Event.listDelete, this.catListDeleteHandlerEvent );
		Mojo.Event.stopListening( this.controller.get( 'trsnCatFilterList' ), Mojo.Event.listTap, this.catListTapHandlerEvent );
		Mojo.Event.stopListening( this.controller.get( 'trsnCatFilterList' ), Mojo.Event.filter, this.searchFilterEvent, true );
	},

	cleanup: function() {
	}
} );
