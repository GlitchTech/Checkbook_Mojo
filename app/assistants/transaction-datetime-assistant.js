/* Copyright 2009 and forward GlitchTech Science. All rights reserved. */

var transactionDTDialog = Class.create( {

	initialize: function( sceneAssistant, unixTime ) {

		this.dateTime = unixTime;

		this.sceneAssistant = sceneAssistant;
		this.controller = sceneAssistant.controller;

		this.yesterdayButtonEvent = this.yesterdayButton.bindAsEventListener( this );
		this.hereAndNowEvent = this.hereAndNow.bindAsEventListener( this );
		this.tomorrowButtonEvent = this.tomorrowButton.bindAsEventListener( this );

		this.checkItEvent = this.checkIt.bindAsEventListener( this );
		this.closeItEvent = this.closeIt.bindAsEventListener( this );
	},

	/** Setup Display **/
	setup: function( widget ) {
		this.widget = widget;

		this.controller.setupWidget(
					'date',
					{
						modelProperty:'date'
					},
					this.dateModel = {
						date:new Date( parseInt( this.dateTime ) )
					}
				);

		this.controller.setupWidget(
					'time',
					{
						modelProperty:'time'
					},
					this.timeModel = {
						time:new Date( parseInt( this.dateTime ) )
					}
				);

		this.controller.setupWidget(
					"yesterdayButton",
					{},
					{
						label: "-"
					}
				);

		this.controller.setupWidget(
					"todayButton",
					{},
					{
						label: $L( "Today" )
					}
				);

		this.controller.setupWidget(
					"tomorrowButton",
					{},
					{
						label: "+"
					}
				);

		this.controller.setupWidget(
					"okButton",
					{},
					{
						label: $L( "Okay" ),
						buttonClass: "affirmative",
						disabled: false
					}
				);

		this.controller.setupWidget(
					"cancelButton",
					{},
					{
						label: $L( "Cancel" ),
						buttonClass: "negative",
						disabled: false
					}
				);

		Mojo.Event.listen( this.controller.get( 'yesterdayButton' ), Mojo.Event.tap, this.yesterdayButtonEvent );
		Mojo.Event.listen( this.controller.get( 'tomorrowButton' ), Mojo.Event.tap, this.tomorrowButtonEvent );
		Mojo.Event.listen( this.controller.get( 'todayButton' ), Mojo.Event.tap, this.hereAndNowEvent );

		Mojo.Event.listen( this.controller.get( 'okButton' ), Mojo.Event.tap, this.checkItEvent );
		Mojo.Event.listen( this.controller.get( 'cancelButton' ), Mojo.Event.tap, this.closeItEvent );

		this.controller.get( 'dt-dialog-title' ).update( $L( "Select a Date and Time" ) );
	},

	/** Create new transaction **/
	handleCommand: function( event ) {

		if( event.type === Mojo.Event.back && checkbookPrefs['bsSave'] === 1 ) {

			this.checkIt();
			event.stop();
		}
	},

	/** Check Required Fields **/
	checkIt: function() {

		this.sceneAssistant.dateTimeModel = Date.parse( this.dateModel.date.toDateString() + " " + this.timeModel.time.toTimeString() );

		this.widget.mojo.close();

		this.sceneAssistant.updateRepeatView();

		this.sceneAssistant.controller.get( 'dateTime_info' ).update( formatDate( new Date( parseInt( this.sceneAssistant.dateTimeModel ) ), { date: 'medium', time: 'short' } ) );
	},

	/** Abort **/
	closeIt: function() {

		this.widget.mojo.close();
	},

	/** Change date to -1 day **/
	yesterdayButton: function() {

		this.dateModel.date.setDate( this.dateModel.date.getDate() - 1 );

		//Update the objects
		this.controller.setWidgetModel(
					'date',
					this.dateModel
				);
	},

	/** Change date and time to current **/
	hereAndNow: function() {

		//Update the objects
		this.controller.setWidgetModel(
					'date',
					this.dateModel = {
						date: new Date()
					}
				);

		this.controller.setWidgetModel(
					'time',
					this.timeModel = {
						time: new Date()
					}
				);
	},

	/** Change date to +1 day **/
	tomorrowButton: function() {

		this.dateModel.date.setDate( this.dateModel.date.getDate() + 1 );

		//Update the objects
		this.controller.setWidgetModel(
					'date',
					this.dateModel
				);
	},

	cleanup: function( event ) {

		Mojo.Event.stopListening( this.controller.get( 'yesterdayButton' ), Mojo.Event.tap, this.yesterdayButtonEvent );
		Mojo.Event.stopListening( this.controller.get( 'tomorrowButton' ), Mojo.Event.tap, this.tomorrowButtonEvent );
		Mojo.Event.stopListening( this.controller.get( 'todayButton' ), Mojo.Event.tap, this.hereAndNowEvent );

		Mojo.Event.stopListening( this.controller.get( 'okButton' ), Mojo.Event.tap, this.checkItEvent );
		Mojo.Event.stopListening( this.controller.get( 'cancelButton' ), Mojo.Event.tap, this.closeItEvent );
	}
} );