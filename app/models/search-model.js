/* Copyright 2009 and forward GlitchTech Science.  All rights reserved. */

var searchModel = Class.create( commonModel, {

	initialize: function( $super ) {

		$super();

		this.systemReady = false;

		this.jtFilterString = "";
		this.jtCount = 0;
		this.jtAcctId = null;

		this.justTypeFilterEvent = this.justTypeFilterFunction.bindAsEventListener( this );
		//Think about breaking some of the per system values out of this
		//This would become just a shell to set up and manage the basic filter field controls
	},

	/** Just Type Search Functions **/
	setupJustTypeSystem: function( currListItem, currAcctId ) {

		Mojo.Log.info( "searchModel - setupJustTypeSystem" );

		this.jtListId = currListItem;
		this.jtAcctId = currAcctId;

		var content = Mojo.View.render( { template: 'models/just-type-view' } );
		this.controller.topContainer().innerHTML += content;

		this.controller.setupWidget( 'cbJustType', { delay: 250, filterFieldHeight: 100 }, {} );

		this.systemReady = true;
	},

	activate: function( $super ) {

		$super();

		if( this.systemReady ) {

			Mojo.Event.listen( this.controller.get( 'cbJustType' ),Mojo.Event.filter, this.justTypeFilterEvent );

			if( this.jtAcctId === null || typeof( this.jtAcctId ) === "undefined" || this.jtAcctId < 0 ) {

				this.jtAllList = accounts_obj['items'];
			} else {

				this.jtAllList = null;

				if( this.jtFilterString != "%%" && this.jtFilterString != "" ) {

					try {

						//Do not like this hack. If not in place, trsn scrolls to very bottom + more...
						this.scrollToItem( 0 );
					} catch( err ) {}
				}
			}
		}
	},

	/**
	 * Determines number of items in search
	 */
	justTypeFilterFunction: function( event, sender ) {

		this.controller.get( this.jtListId ).mojo.revealItem( 0, false );

		this.jtFilterString = "%" + event.filterString + "%";

		if( this.jtAcctId === null || typeof( this.jtAcctId ) === "undefined" || this.jtAcctId < 0 ) {

			accountsDB.transaction(
				(
					function( transaction ) {

						var countQry = "SELECT COUNT( acctId ) AS filterCount FROM accounts WHERE acctName LIKE ? OR acctNotes LIKE ? OR acctCategory LIKE ?;";

						transaction.executeSql( countQry, [ this.jtFilterString, this.jtFilterString, this.jtFilterString ], this.justTypeFilterFunctionHandler.bind( this ), this.sqlError.bind( this, "justTypeFilterFunction Acct", countQry ) );
					}
				).bind( this ) );
		} else {

			accountsDB.transaction(
				(
					function( transaction ) {

						var countQry = "SELECT COUNT( itemId ) AS filterCount FROM transactions WHERE account = ? AND ( desc LIKE ? OR note LIKE ? OR checkNum LIKE ? OR amount LIKE ? );";

						transaction.executeSql( countQry, [ this.jtAcctId, this.jtFilterString, this.jtFilterString, this.jtFilterString, this.jtFilterString ], this.justTypeFilterFunctionHandler.bind( this ), this.sqlError.bind( this, "justTypeFilterFunction Trsn", countQry ) );
					}
				).bind( this ) );
		}
	},

	justTypeFilterFunctionHandler: function( transaction, results ) {

		if( results.rows.length <= 0 ) {

			this.jtCount = 0;
		} else {

			this.jtCount = results.rows.item( 0 )['filterCount'];
		}

		this.controller.get( 'cbJustType' ).mojo.setCount( this.jtCount );

		var jtList = this.controller.get( this.jtListId );

		if( this.jtAcctId === null || typeof( this.jtAcctId ) === "undefined" || this.jtAcctId < 0 ) {

			if( this.jtFilterString == "%%" || this.jtFilterString == "" ) {

				accounts_obj['items'] = this.jtAllList;
				Element.show( this.controller.get( 'main' ) );
			} else {

				accounts_obj['items'] = this.justTypeFilterFunctionFetchItems( this.jtFilterString );
				Element.hide( this.controller.get( 'main' ) );
			}
		}

		jtList.mojo.setLengthAndInvalidate( this.jtCount );
	},

	justTypeFilterFunctionFetchItems: function( inFilter ) {

		inFilter = inFilter.substring( 1, inFilter.length - 1 );

		var items = [];

		for( var i = 0; i < this.jtAllList.length; i++ ) {

			if( this.jtAllList[i]['name'].toLowerCase().indexOf( inFilter ) >= 0 ||
				this.jtAllList[i]['description'].toLowerCase().indexOf( inFilter ) >= 0 ||
				this.jtAllList[i]['category'].toLowerCase().indexOf( inFilter ) >= 0 ) {

				items.push( this.jtAllList[i] );
			}
		}

		return items;
	},

	justTypeGetFilter: function() {

		return this.jtFilterString;
	},

	justTypeGetCount: function() {

		return this.jtCount;
	},

	deactivate: function( $super ) {

		$super();

		if( this.systemReady ) {

			Mojo.Event.stopListening( this.controller.get( 'cbJustType' ), Mojo.Event.filter, this.justTypeFilterEvent );

			if( this.jtAcctId === null || typeof( this.jtAcctId ) === "undefined" || this.jtAcctId < 0 ) {

				accounts_obj['items'] = this.jtAllList;

				this.jtCount = 0;
				this.jtFilterString = "";

				this.controller.get( 'cbJustType' ).mojo.setCount( this.jtCount );
				this.controller.get( 'cbJustType' ).mojo.close();

				Element.show( this.controller.get( 'main' ) );
			}
		}
	},

	cleanup: function( $super ) {

		$super();
	}
});
