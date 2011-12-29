/* Copyright 2009 and forward GlitchTech Science. All rights reserved. */

var multiSelectDialog = Class.create( {

	initialize: function( sceneAssistant, list, callbackFn ) {

		this.sceneAssistant = sceneAssistant;
		this.controller = sceneAssistant.controller;

		this.list = list;
		this.callbackFn = callbackFn;

		this.saveEvent = this.saveChanges.bindAsEventListener( this );
		this.abortEvent = this.abortChanges.bindAsEventListener( this );
	},

	/** Setup Display **/
	setup: function( widget ) {
		this.widget = widget;

		//multiselectList

		this.controller.setupWidget(
					"okButton",
					{},
					{
						label:$L( "Okay" ),
						buttonClass:"affirmative",
						disabled:false
					}
				);

		this.controller.setupWidget(
					"cancelButton",
					{},
					{
						label:$L( "Cancel" ),
						buttonClass:"negative",
						disabled:false
					}
				);

		//List needs listeners for tapping

		Mojo.Event.listen( this.controller.get( 'okButton' ), Mojo.Event.tap, this.saveEvent );
		Mojo.Event.listen( this.controller.get( 'cancelButton' ), Mojo.Event.tap, this.abortEvent );
	},

	/** Check Required Fields **/
	saveChanges: function() {

		this.callbackFn( this.listWidget['items'] );

		this.widget.mojo.close();
	},

	/** Abort **/
	abortChanges: function() {

		this.widget.mojo.close();
	},

	cleanup: function( event ) {

		Mojo.Event.stopListening( this.controller.get( 'okButton' ), Mojo.Event.tap, this.saveEvent );
		Mojo.Event.stopListening( this.controller.get( 'cancelButton' ), Mojo.Event.tap, this.abortEvent );
	}
} );
