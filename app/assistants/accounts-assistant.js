/* Copyright 2009 and forward GlitchTech Science.  All rights reserved. */

var AccountsAssistant = Class.create( searchModel, {

	initialize: function( $super ) {

		$super();

		this.listDeleteHandlerEvent = this.listDeleteHandler.bindAsEventListener( this );
		this.listTapHandlerEvent = this.listTapHandler.bindAsEventListener( this );
		this.listReorderHandlerEvent = this.listReorderHandler.bindAsEventListener( this );

		this.headerTapEvent = this.headerTapHandler.bindAsEventListener( this );

		this.metatapUpEvent = this.metatapUpHandler.bindAsEventListener( this );
		this.metatapDownEvent = this.metatapDownHandler.bindAsEventListener( this );
	},

	setup: function() {

		//Main List
		this.dispOffset = 0;
		this.dispCount = 0;

		this.dataAttr = {
			itemTemplate:'accounts/listItemTemplate',
			dividerTemplate:'accounts/dividerTemplate',
			dividerFunction: this.dividerFunc.bind( this ),
			nullItemTemplate:'models/pendingItemTemplate',
			emptyTemplate:'accounts/accountSimpleGuide',

			renderLimit:30,
			lookahead:15,

			hasNoWidgets: true,
			swipeToDelete: true,
			autoconfirmDelete: false,
			reorderable: true
		};

		this.controller.setupWidget( 'accountList', this.dataAttr, accounts_obj );

		this.setupJustTypeSystem( 'accountList', null );

		/** Command Menu **/
		if( typeof( checkbookPrefs['custom_sort'] ) !== "number" ) {

			checkbookPrefs['custom_sort'] = 0;
		}

		this.controller.setupWidget( 'sort-sub-menu', null, accountSortOptionsModel );

		this.controller.setupWidget( 'search-sub-menu', null, appMenuFeatures );

		this.cmdMenuModel = {
								visible: true,
								items: [
									{
										icon:'sort',
										submenu: 'sort-sub-menu'
									},
									{
										items: [
											{
												icon: 'new',
												command: 'newAccount'
											}, {
												icon: 'lock',
												command: 'lock'
											}
										]
									},
									{
										icon:'search',
										submenu:'search-sub-menu'
									}
								] };

		this.controller.setupWidget( Mojo.Menu.commandMenu, undefined, this.cmdMenuModel );

		this.controller.setupWidget( Mojo.Menu.appMenu, appMenuOptions, appMenuModel );

		this.setupLoadingSystem();
	},

	ready: function() {

		this.metaKeyPressed = false;

		this.controller.get( 'accounts-label').update( $L( "Accounts" ) );
	},

	//500ms before activate
	aboutToActivate: function() {

		Mojo.Log.info( "AccountsAssistant - aboutToActivate" );
	},

	//Scene made visible
	activate: function( $super ) {

		$super();

		Mojo.Log.info( "AccountsAssistant - activate" );

		this.updateView();

		this.metaKeyPressed = false;

		Mojo.Event.listen( this.controller.get( 'accountList' ), Mojo.Event.listDelete, this.listDeleteHandlerEvent );
		Mojo.Event.listen( this.controller.get( 'accountList' ), Mojo.Event.listTap, this.listTapHandlerEvent );
		Mojo.Event.listen( this.controller.get( 'accountList' ), Mojo.Event.listReorder, this.listReorderHandlerEvent );

		Mojo.Event.listen( this.controller.get( 'balance-button' ), Mojo.Event.tap, this.headerTapEvent );

		Mojo.Event.listen( this.controller.stageController.document, 'keyup', this.metatapUpEvent );
		Mojo.Event.listen( this.controller.stageController.document, 'keydown', this.metatapDownEvent );

		//class == arrow_button
		//set up close listener
		//acctCatId#{acctCatId} -- id of arrow button
		//acctCatGroup#{acctCatId} -- class of div group

		/*
		if( OPEN SECTION ) {

			toggleButton.addClassName( "palm-arrow-expanded" );
			toggleButton.removeClassName( "palm-arrow-closed" );
		} else {

			toggleButton.addClassName( "palm-arrow-closed" );
			toggleButton.removeClassName( "palm-arrow-expanded" );
		}
		*/

		checkAppUpdate( this.controller.stageController );
	},

	dividerFunc: function( itemModel ) {

		if( checkbookPrefs['custom_sort'] === 0 || checkbookPrefs['custom_sort'] === 3) {

			return itemModel.category;
		} else if( checkbookPrefs['custom_sort'] === 2 ) {

			return itemModel.name.charAt(0);
		} else if( checkbookPrefs['custom_sort'] === 1 ) {

			return $L( "Custom Account" );
		} else {

			return "";
		}
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

	/** List Item deleted **/
	listDeleteHandler: function( event ) {

		this.startSpinner();

		var itemIndex = event.item['index'];

		try {

			this.controller.get( 'accountList' ).mojo.noticeRemovedItems( itemIndex, 1 );
		} catch( err ) {

			systemError( err );
		}

		this.deleteAccount(
				itemIndex,
				function() {

					this.updateView();
				}.bind( this ) );

		event.stop();
	},

	/** List Item tapped **/
	listTapHandler: function( event ) {

		this.updateLoadingSystem( true, $L( "Loading Account" ), $L( "Please wait..." ), 0 );

		if( this.cmdMenuModel['items'][1]['items'][1]['icon'] === 'unlock' || this.metaKeyPressed ) {

			if( event.item['locked'] == 1 ) {

				this.controller.stageController.pushScene( "login", "addEdit-account", event.item['lockedCode'], "back", event.item );
			} else {

				this.controller.stageController.pushScene( "addEdit-account", event.item );
			}
		} else {

			if( event.item['locked'] == 1 ) {

				this.controller.stageController.pushScene( "login", { name: "transactions" }, event.item['lockedCode'], "back", event.item.rowId, event.item.index );
			} else {

				this.controller.stageController.pushScene( { name: "transactions" }, event.item.rowId, event.item.index );
			}
		}

		this.hideLoadingSystemDelayed( 0.5 );
	},

	/** List Order Change **/
	listReorderHandler: function( event ) {

		accounts_obj['items'].splice( event.fromIndex, 1 );
		accounts_obj['items'].splice( event.toIndex, 0, event.item );

		accountsDB.transaction(
			(
				function( transaction ) {

					var start = 0;
					var end = accounts_obj['items'].length;

					if( checkbookPrefs['custom_sort'] === 1 ) {

						start = ( event.fromIndex < event.toIndex ? event.fromIndex : event.toIndex );
						end = ( event.fromIndex > event.toIndex ? event.fromIndex : event.toIndex );
					}

					start = ( start >= 0 ? start : 0 );
					end = ( end < accounts_obj['items'].length ? end : accounts_obj['items'].length - 1 );

					for( var i = start; i <= end; i++ ) {

						accounts_obj['items'][i]['index'] = i;

						//Update accounts, change order
						transaction.executeSql( "UPDATE accounts SET sect_order = ? WHERE rowid = ?;", [ i, accounts_obj['items'][i]['rowId'] ], this.successHandler.bind( this ), this.sqlError.bind( this, "listReorderHandler" ) );
					}

					accounts_obj['items_changed'] = true;
					checkbookPrefs['custom_sort'] = 1;

					qryAcctSortUpdate = "UPDATE prefs SET custom_sort = ?;";

					transaction.executeSql(
							qryAcctSortUpdate,
							[checkbookPrefs['custom_sort']],
							this.successHandler.bind( this ),
							this.sqlError.bind( this, qryAcctSortUpdate ) );

					this.updateView();
				}
			).bind( this ) );
	},

	/** Create new account **/
	handleCommand: function( event ) {

		if( event.type === Mojo.Event.command ) {

			if( event.command.indexOf( "SORT_COMMAND" ) !== -1 ) {

				this.startSpinner();

				checkbookPrefs['custom_sort'] = parseInt( event.command.replace( "SORT_COMMAND", "" ) );

				qryAcctSortUpdate = "UPDATE prefs SET custom_sort = ?;";

				accountsDB.transaction(
					(
						function( transaction ) {

							transaction.executeSql(
									qryAcctSortUpdate,
									[checkbookPrefs['custom_sort']],
									this.successHandler.bind( this ),
									this.sqlError.bind( this, qryAcctSortUpdate ) );
						}
					).bind( this ) );

				this.loadAllAccounts( 0, 25, this.updateView.bind( this ) );
				event.stop();
			} else {

				switch( event.command ) {

					case 'newAccount':
						this.controller.stageController.pushScene( "addEdit-account" );
						event.stop();
						break;
					case 'lock':
						this.cmdMenuModel['items'][1]['items'][1]['icon'] = ( this.cmdMenuModel['items'][1]['items'][1]['icon'] === 'unlock' ? 'lock' : 'unlock' );
						this.controller.modelChanged( this.cmdMenuModel );
						event.stop();
						break;
				}
			}
		}
	},

	updateView: function() {

		if( !this.systemActive() ) {

			this.startSpinner();
		}

		//Make sure the system is using the latest version of the data
		if( accounts_obj['items_changed'] !== false ) {

			this.controller.modelChanged( accounts_obj );
			accounts_obj['items_changed'] = false;

			var headerBalanceElem = this.controller.get( 'transactionHeaderBalance' );

			headerBalanceElem.removeClassName( "negativeBalanceLight" );
			headerBalanceElem.removeClassName( "positiveBalanceLight" );
			headerBalanceElem.removeClassName( "neutralBalanceLight" );

			var balanceColor = "neutralBalanceLight";
			if( ( Math.round( accounts_obj['totalBalance'][4] * 100 ) / 100 ) > 0 ) {

				balanceColor = 'positiveBalanceLight';
			} else if( ( Math.round( accounts_obj['totalBalance'][4] * 100 ) / 100 ) < 0 ) {

				balanceColor = 'negativeBalanceLight';
			}

			headerBalanceElem.update( formatAmount( accounts_obj['totalBalance'][4] ) );
			headerBalanceElem.addClassName( balanceColor );
		}

		this.stopSpinner();
	},

	startSpinner: function() {

		Element.hide( this.controller.get( 'transactionHeaderBalance' ) );

		this.updateLoadingSystem( true, $L( "Loading Accounts" ), $L( "Please wait..." ), 0 );
	},

	stopSpinner: function() {

		if( this.systemActive() ) {

			Element.show( this.controller.get( 'transactionHeaderBalance' ) );

			this.updateLoadingSystem( false, "", "", 0 );
		}
	},

	/** Header Tapped **/
	headerTapHandler: function( event ) {

		if( accounts_obj['items'].length > 0 ) {

			this.popupBalance = [
							{
								label: this.formatBalancePopup( $L( "Default:" ), accounts_obj['totalBalance'][4] ),
								command: '4'
							}, {
								label: this.formatBalancePopup( $L( "Available:" ), accounts_obj['totalBalance'][0] ),
								command: '0'
							}, {
								label: this.formatBalancePopup( $L( "Cleared:" ), accounts_obj['totalBalance'][1] ),
								command: '1'
							}, {
								label: this.formatBalancePopup( $L( "Pending:" ), accounts_obj['totalBalance'][3] ),
								command: '3'
							}, {
								label: this.formatBalancePopup( $L( "Final:" ), accounts_obj['totalBalance'][2] ),
								command: '2'
							}
						];

			this.controller.popupSubmenu(
					{
						toggleCmd: bal_view,
						manualPlacement: true,
						popupClass: "balance-popup",
						items: this.popupBalance,
						onChoose: this.headerPopupHandler
					}
				);
		}
	},

	formatBalancePopup: function( type, value ) {

		var balanceColor = "neutralFunds";
		if( ( Math.round( value * 100 ) / 100 ) > 0 ) {

			balanceColor = 'positiveFunds';
		} else if( ( Math.round( value * 100 ) / 100 ) < 0 ) {

			balanceColor = 'negativeFunds';
		}

		return( type + " <span class='" + balanceColor + "'>" + formatAmount( parseFloat( value ) ) + "</span>" );
	},

	headerPopupHandler: function( command ) {

		if( command && typeof( command ) !== "undefined" && command !== "" && !isNaN( command ) ) {

			if( !this.systemActive() ) {

				this.startSpinner();
			}

			bal_view = command;

			//update header
			var headerBalanceElem = this.controller.get( 'transactionHeaderBalance' );

			headerBalanceElem.removeClassName( "negativeBalanceLight" );
			headerBalanceElem.removeClassName( "positiveBalanceLight" );
			headerBalanceElem.removeClassName( "neutralBalanceLight" );

			if( accounts_obj['items'].length > 0 ) {

				var balanceColor = "neutralBalanceLight";
				if( ( Math.round( accounts_obj['totalBalance'][bal_view] * 100 ) / 100 ) > 0 ) {

					balanceColor = 'positiveBalanceLight';
				} else if( ( Math.round( accounts_obj['totalBalance'][bal_view] * 100 ) / 100 ) < 0 ) {

					balanceColor = 'negativeBalanceLight';
				}

				headerBalanceElem.update( formatAmount( accounts_obj['totalBalance'][bal_view] ) );
				headerBalanceElem.addClassName( balanceColor );
			} else {

				this.controller.get( 'transactionHeaderBalance' ).update( "" );
			}

			var currBal = "";
			switch( bal_view ) {
				case '0':
					currBal = 'balance0';
					break;
				case '1':
					currBal = 'balance1';
					break;
				case '2':
					currBal = 'balance2';
					break;
				case '3':
					currBal = 'balance3';
					break;
				default:
					currBal = 'balance4';
			}

			this.balanceSwapCyclic( 0, 25, currBal );
		}
	},

	balanceSwapCyclic: function( offset, count, currBal ) {

		var limit = offset + count;

		if( limit >= accounts_obj['items'].length ) {

			limit = accounts_obj['items'].length;
		}

		for( var i =  offset; i < limit; i++ ) {

			accounts_obj['items'][i]['balance'] = accounts_obj['items'][i][currBal];

			var balanceColor = "neutralFunds";
			if( ( Math.round( accounts_obj['items'][i]['balance'] * 100 ) / 100 ) > 0 ) {

				balanceColor = 'positiveFunds';
			} else if( ( Math.round( accounts_obj['items'][i]['balance'] * 100 ) / 100 ) < 0 ) {

				balanceColor = 'negativeFunds';
			}

			accounts_obj['items'][i]['fontColor'] = balanceColor;
			accounts_obj['items'][i]['balance'] = formatAmount( parseFloat( accounts_obj['items'][i]['balance'] ) );
		}

		if( limit >= accounts_obj['items'].length ) {

			this.controller.modelChanged( accounts_obj );
			this.stopSpinner();
		} else {

			//slight pause
			var nextFn = this.balanceSwapCyclic.bind( this, limit, count, currBal );
			var delayNextFn = nextFn.defer();
		}
	},

	successHandler: function( transaction, results ) {
	},

	deactivate: function( $super, event ) {

		$super();

		Mojo.Log.info( "AccountsAssistant - deactivate" );

		Mojo.Event.stopListening( this.controller.get( 'accountList' ), Mojo.Event.listDelete, this.listDeleteHandlerEvent );
		Mojo.Event.stopListening( this.controller.get( 'accountList' ), Mojo.Event.listTap, this.listTapHandlerEvent );
		Mojo.Event.stopListening( this.controller.get( 'accountList' ), Mojo.Event.listReorder, this.listReorderHandlerEvent );

		Mojo.Event.stopListening( this.controller.get( 'balance-button' ), Mojo.Event.tap, this.headerTapEvent );

		Mojo.Event.stopListening( this.controller.stageController.document, 'keyup', this.metatapUpEvent );
		Mojo.Event.stopListening( this.controller.stageController.document, 'keydown', this.metatapDownEvent );
	},

	cleanup: function( event ) {

		accounts_obj['items'].clear();
		accounts_obj['items'] = null;
	}
} );
