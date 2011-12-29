/* Copyright 2009 and forward GlitchTech Science. All rights reserved. */

var updateMessageDialog = Class.create( {

	initialize: function( controllerIn ) {

		this.controller = controllerIn;

		this.updateNoticeHandlerEvent = this.updateNoticeHandler.bindAsEventListener( this );

		this.viewUpdateEvent = this.viewUpdate.bindAsEventListener( this );
		this.ignoreUpdateEvent = this.closeNotice.bindAsEventListener( this );
	},

	/** Setup Display **/
	setup: function( widget ) {
		this.widget = widget;

		this.controller.setupWidget(
				"updateCheckNotification",
				{//Attributes
					trueValue: 1,
					trueLabel: $L( "Show" ),
					falseValue: 0,
					falseLabel: $L( "Hide" )
				},
				this.updateCheckNotification = {
					value: checkbookPrefs['updateCheckNotification']
				}
			);

		this.controller.setupWidget(
					"okButton",
					{},
					{
						label: $L( 'Yes' ),
						buttonClass: "blue",
						disabled: false
					}
				);

		this.controller.setupWidget(
					"cancelButton",
					{},
					{
						label: $L( 'No' ),
						buttonClass: "negative",
						disabled: false
					}
				);

		this.controller.get( 'update-message' ).update( $L( "Checkbook has been updated, would you like to view the change log?" ) );
		this.controller.get( 'update-title' ).update( $L( "Checkbook Software Updated" ) );
		this.controller.get( 'update-toggle' ).update( $L( "Update Notice" ) );

		Mojo.Event.listen( this.controller.get( 'updateCheckNotification' ), Mojo.Event.propertyChange, this.updateNoticeHandlerEvent );

		Mojo.Event.listen( this.controller.get( 'okButton' ), Mojo.Event.tap, this.viewUpdateEvent );
		Mojo.Event.listen( this.controller.get( 'cancelButton' ), Mojo.Event.tap, this.ignoreUpdateEvent );
	},

	viewUpdate: function() {

		this.controller.stageController.pushScene( "changelog" );

		this.widget.mojo.close();
	},

	updateNoticeHandler: function() {

		checkbookPrefs['updateCheckNotification'] = this.updateCheckNotification.value;

		accountsDB.transaction(
			(
				function( transaction ) {

					transaction.executeSql( "UPDATE prefs SET updateCheckNotification = ?;", [ checkbookPrefs['updateCheckNotification'] ] );
				}
			).bind( this ) );
	},

	closeNotice: function() {

		this.widget.mojo.close();
	},

	cleanup: function( event ) {

		Mojo.Event.stopListening( this.controller.get( 'updateCheckNotification' ), Mojo.Event.propertyChange, this.updateNoticeHandlerEvent );

		Mojo.Event.stopListening( this.controller.get( 'okButton' ), Mojo.Event.tap, this.viewUpdateEvent );
		Mojo.Event.stopListening( this.controller.get( 'cancelButton' ), Mojo.Event.tap, this.ignoreUpdateEvent );
	}
} );