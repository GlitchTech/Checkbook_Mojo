/* Copyright 2009 and forward GlitchTech Science.  All rights reserved. */

var TransactionUtilAssistant = Class.create( {

	initialize: function( sceneAssistant, type ) {

		this.sceneAssistantParent = sceneAssistant;
		this.eventType = type;

		this.returnToParentEvent = this.returnToParent.bindAsEventListener( this );
		this.closeItEvent = this.closeIt.bindAsEventListener( this );
	},

	setup: function() {

		this.controller.setupWidget(
					"clearedToggle",
					{
						trueValue: "1",
						falseValue: "0"
					},
					this.clearedToggle = {
						value: "1"
					}
				);

		this.controller.setupWidget(
					"dateToggle",
					{
						trueValue: "1",
						falseValue: "0"
					},
					this.dateToggle = {
						value: "1"
					}
				);

		this.controller.setupWidget(
					'date',
					{
						modelProperty: 'date'
					},
					this.dateModel = {
						date: new Date()
					}
				);

		var lbl;
		var cls;

		if( this.eventType === "purge" ) {

			lbl = $L( "Purge" );
			cls = "negative";
		} else if( this.eventType === "combine" ) {

			lbl = $L( "Trim" );
			cls = "blue";
		} else {//clear_m

			lbl = $L( "Clear" );
			cls = "blue";
		}

		this.controller.setupWidget(
					"okButton",
					{},
					{
						label: lbl,
						buttonClass: cls
					}
				);

		this.controller.setupWidget(
					"cancelButton",
					{},
					{
						label: $L( "Cancel" ),
						buttonClass: "primary"
					}
				);

		var sceneMenuModel = {
							visible: true,
							items: [
								Mojo.Menu.editItem,
								appMenuPrefAccountsDisabled,
								appMenuFeaturesDisabled,
								cbHelpItem,
								cbAboutItem
							]
						};

		this.controller.setupWidget( Mojo.Menu.appMenu, appMenuOptions, sceneMenuModel );

		Mojo.Event.listen( this.controller.get( 'okButton' ), Mojo.Event.tap, this.returnToParentEvent );
		Mojo.Event.listen( this.controller.get( 'cancelButton' ), Mojo.Event.tap, this.closeItEvent );
	},

	ready: function() {

		if( this.eventType === "purge" ) {

			this.controller.get( 'purgeCombineTitle' ).update( $L( "Purge Transactions" ) );
			this.controller.get( 'functDesc' ).update( $L( "This utility will completely remove any transactions from the system that fit in the restrictions below. The overall balance will change." ) );
		} else if( this.eventType === "combine" ) {

			this.controller.get( 'purgeCombineTitle' ).update( $L( "Trim Transactions" ) );
			this.controller.get( 'functDesc' ).update( $L( "This utility will combine all the transactions into one new transaction according to the below restrictions. The overall balance will not change." ) );
		} else {//clear_m

			this.controller.get( 'purgeCombineTitle' ).update( $L( "Clear Transactions" ) );
			this.controller.get( 'functDesc' ).update( $L( "This utility will mark all the transactions that fit in the restrictions below as cleared. This may change your balance, but no items will be added or removed." ) );
		}

		this.controller.get( 'clear-toggle-label' ).update( $L( "Restrict to Cleared" ) );
		this.controller.get( 'clear-toggle-preview' ).update( $L( "Limit to Cleared transactions." ) );

		this.controller.get( 'restrict-date-label' ).update( $L( "Restrict Date" ) );
		this.controller.get( 'restrict-date-preview' ).update( $L( "Only includes items up to or including selected date." ) );
	},

	aboutToActivate: function() {

		if( this.eventType === "clear_m" ) {

			Element.hide( this.controller.get( 'trsnUtilClearedRow' ) );

			var dateRow = this.controller.get( 'trsnUtilDateRow' );

			dateRow.removeClassName( "last" );
			dateRow.addClassName( "single" );
		}
	},

	activate: function() {
	},

	returnToParent: function() {

		if( this.eventType === "purge" ) {

			this.sceneAssistantParent.qryTransactionPurgeHandler( this.clearedToggle.value, this.dateToggle.value, this.dateModel.date );
		} else if( this.eventType === "combine" ) {

			this.sceneAssistantParent.qryTransactionCombineHandler( this.clearedToggle.value, this.dateToggle.value, this.dateModel.date );
		} else {//clear_m

			this.sceneAssistantParent.qryTransactionClearMHandler( this.clearedToggle.value, this.dateToggle.value, this.dateModel.date );
		}

		this.sceneAssistantParent.scrollerSet['doScroll'] = true;

		this.closeIt();
	},

	closeIt: function() {

		this.controller.stageController.popScene();
	},

	deactivate: function() {

		Mojo.Event.stopListening( $( 'okButton' ), Mojo.Event.tap, this.returnToParentEvent );
		Mojo.Event.stopListening( $( 'cancelButton' ), Mojo.Event.tap, this.closeItEvent );
	},

	cleanup: function() {
	}
} );
