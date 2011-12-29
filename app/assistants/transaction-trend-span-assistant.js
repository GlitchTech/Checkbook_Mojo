/* Copyright 2009 and forward GlitchTech Science. All rights reserved. */

var transactionTrendSpanDialog = Class.create( {

	initialize: function( sceneAssistant ) {

		this.sceneAssistant = sceneAssistant;
		this.controller = sceneAssistant.controller;

		this.hereAndNowEvent = this.hereAndNow.bindAsEventListener( this );

		this.checkItEvent = this.checkIt.bindAsEventListener( this );
		this.closeItEvent = this.closeIt.bindAsEventListener( this );
	},

	/** Setup Display **/
	setup: function( widget ) {
		this.widget = widget;

		this.controller.setupWidget(
					'startDate',
					{
						label:$L( "From" ),

						modelProperty:'date'
					},
					this.startDateModel = {
						date:new Date( this.sceneAssistant.planStart )
					}
				);

		this.controller.setupWidget(
					'stopDate',
					{
						label:$L( "To" ),

						modelProperty:'date'
					},
					this.stopDateModel = {
						date:new Date( this.sceneAssistant.planEnd )
					}
				);

		this.controller.setupWidget(
					"todayButton",
					{},
					{
						label: $L( "Default" )
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

		Mojo.Event.listen( this.controller.get( 'todayButton' ), Mojo.Event.tap, this.hereAndNowEvent );

		Mojo.Event.listen( this.controller.get( 'okButton' ), Mojo.Event.tap, this.checkItEvent );
		Mojo.Event.listen( this.controller.get( 'cancelButton' ), Mojo.Event.tap, this.closeItEvent );

		this.controller.get( 'trsn-plan-span-title' ).update( $L( "Select Date Span" ) );
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

		if( this.startDateModel['date'] > this.stopDateModel['date'] ) {

			var temp = this.startDateModel['date'];
			this.startDateModel['date'] = this.stopDateModel['date'];
			this.stopDateModel['date'] = temp;
		}

		this.sceneAssistant.planStart = Date.parse( this.startDateModel['date'].toDateString() + " 00:00:00" );
		this.sceneAssistant.planEnd = Date.parse( this.stopDateModel['date'].toDateString() + " 23:59:59" );

		this.sceneAssistant.startSpinner();

		this.widget.mojo.close();

		this.sceneAssistant.fetchBudget();
	},

	/** Abort **/
	closeIt: function() {

		this.widget.mojo.close();
	},

	/** Change date and time to current **/
	hereAndNow: function() {

		var currDate = new Date();

		//Month 1st at 12:00:00am
		currDate.setDate( 1 );
		this.startDateModel['date'] = new Date( currDate.toDateString() + " 00:00:00" );

		//Month Last at 11:59:59pm
		currDate.setDate( daysInMonth( currDate.getMonth(), currDate.getFullYear() ) );
		this.stopDateModel['date'] = new Date( currDate.toDateString() + " 23:59:59" );

		this.controller.modelChanged( this.startDateModel );
		this.controller.modelChanged( this.stopDateModel );
	},

	cleanup: function( event ) {

		Mojo.Event.stopListening( this.controller.get( 'todayButton' ), Mojo.Event.tap, this.hereAndNowEvent );

		Mojo.Event.stopListening( this.controller.get( 'okButton' ), Mojo.Event.tap, this.checkItEvent );
		Mojo.Event.stopListening( this.controller.get( 'cancelButton' ), Mojo.Event.tap, this.closeItEvent );
	}
} );