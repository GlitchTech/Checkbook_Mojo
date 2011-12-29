/* Copyright 2009 and forward GlitchTech Science.  All rights reserved. */

var RepeatAssistant = Class.create( {

	initialize: function( sceneAssistant ) {

		this.sceneAssistantParent = sceneAssistant;

		//Week Model, makes it easier than setting 7 boxes up
		this.dailyRepeat = [
			{
				day: 'SU',
				model: {
					value: false
				}
			}, {
				day: 'MO',
				model: {
					value: false
				}
			}, {
				day: 'TU',
				model: {
					value: false
				}
			}, {
				day: 'WE',
				model: {
					value: false
				}
			}, {
				day: 'TH',
				model: {
					value: false
				}
			}, {
				day: 'FR',
				model: {
					value: false
				}
			}, {
				day: 'SA',
				model: {
					value: false
				}
			}
		];


		var dateObj = new Date( parseInt( this.sceneAssistantParent.dateTimeModel ) );

		var dayFormatter = Mojo.Format.formatChoice( dateObj.getDate(), "1#1st|2#2nd|3#3rd|3>##{day}th", { day: dateObj.getDate() } )

		this.howOften = [
			{
				label: $L( 'No Repeat' ),
				value: $L( '' )
			}, {
				label: $L( 'Daily' ),
				value: $L( 'day(s)' )
			}, {
				label: $L( 'Weekly' ),
				value: $L( 'week(s)' )
			}, {
				label: $L( 'Monthly on the ' + dayFormatter ),
				value: $L( 'month(s)' )
			}, {
				label: $L( 'Yearly on ' ) + formatDate( dateObj, { date: 'medium', time: '' } ).slice( 0, 3 ) + ' ' + dayFormatter,
				value: $L( 'year(s)' )
			}
		];

		this.endingCondition = [
			{
				label: $L( 'Forever' ),
				value: 'f'
			}, {
				label: $L( 'Until Date' ),
				value: 'd'
			}, {
				label: $L( 'Occurrences' ),
				value: 'o'
			}
		];

		this.weekItemTappedHandler = this.weekItemTapped.bindAsEventListener( this );
		this.repeatUntilHandler = this.repeatUntil.bindAsEventListener( this );
	},

	setup: function() {

		if( this.sceneAssistantParent.repeatTrsn.frequency.length > 0 && this.sceneAssistantParent.repeatTrsn.daysOfWeek !== "" ) {

			this.repeatFrequency = this.sceneAssistantParent.repeatTrsn.frequency;
			this.repeatDaysOfWeek = this.sceneAssistantParent.repeatTrsn.daysOfWeek;
			this.repeatItemSpan = this.sceneAssistantParent.repeatTrsn.itemSpan;
			this.repeatEndingCondition = this.sceneAssistantParent.repeatTrsn.endingCondition;
		} else {

			this.repeatFrequency = "";
			this.repeatDaysOfWeek = {
								'SU': "0",
								'MO': "0",
								'TU': "0",
								'WE': "0",
								'TH': "0",
								'FR': "0",
								'SA': "0"
							};
			this.repeatItemSpan = 1;
			this.repeatEndingCondition = "f";
		}

		this.controller.setupWidget(
				"repeatFreq",
				{
					label: $L( "Frequency" )
				},
				this.howOftenModel = {
					value: this.repeatFrequency,
					choices: this.howOften
				}
			);

		this.dailyRepeat.each(
				function( dayItem ) {

					dayItem.model.value = this.repeatDaysOfWeek[dayItem.day];

					this.controller.setupWidget(
								dayItem.day,
								{
									trueValue: "1",
									falseValue: "0"
								},
								dayItem.model
							);
				}, this );

		this.controller.setupWidget( "repeatFreqDrawer", { unstyled: true }, { open: false } );

		this.controller.setupWidget(
				'spanPicker',
				{
					label: " ",
					modelProperty: 'value',
					min: 1,
					max: 99
				},
				this.spanModel = {
					value: this.repeatItemSpan
				}
			);

		this.controller.setupWidget( "spanPickerDrawer", { unstyled: true }, { open: false } );
		this.controller.setupWidget( "repeatUntilGroup", { unstyled: true }, { open: false } );

		this.controller.setupWidget(
				"repeatUntil",
				{
					label: $L( "Repeat Until" )
				},
				this.endingConditionModel = {
					value: this.repeatEndingCondition,
					choices: this.endingCondition
				}
			);

		this.controller.setupWidget(
				'repeatUntilDate',
				{
					label: " ",
					modelProperty: 'date'
				},
				this.repeatUntilDateModel = {
					date: ( this.sceneAssistantParent.repeatTrsn.endDate !== "" ? new Date( parseInt( this.sceneAssistantParent.repeatTrsn.endDate ) ) : new Date( parseInt( this.sceneAssistantParent.dateTimeModel ) ) )
				}
			);

		this.controller.setupWidget( "repeatUntilDateDrawer", { unstyled: true }, { open: false } );

		this.controller.setupWidget(
				'repeatUntilCount',
				{
					label: " ",
					modelProperty: 'value',
					min: 1,
					max: 100
				},
				this.repeatUntilCountModel = {
					value: ( this.sceneAssistantParent.repeatTrsn.endCount !== "" ? this.sceneAssistantParent.repeatTrsn.endCount : 1 )
				}
			);

		this.controller.setupWidget( "repeatUntilCountDrawer", { unstyled: true }, { open: false } );

		var acctPrefsMenuModel = {
							visible: true,
							items: [
								Mojo.Menu.editItem,
								appMenuPrefAccountsDisabled,
								appMenuFeaturesDisabled,
								cbAboutItem,
								cbHelpItem
							]
						};

		this.controller.setupWidget( Mojo.Menu.appMenu, appMenuOptions, acctPrefsMenuModel );

		var returnButton = {
					visible: true,
					items: [
						{
							icon: "back",
							command:'return'
						}
					]
				};

		this.controller.setupWidget( Mojo.Menu.commandMenu, {}, returnButton );
	},

	ready: function() {

		this.controller.get( "transDesc" ).update( cleanString( this.sceneAssistantParent.descModel.value ) );

		this.weekItemTapped();
		this.repeatUntil();
	},

	aboutToActivate: function() {
	},

	activate: function() {

		Mojo.Event.listen( this.controller.get( 'repeatFreq' ), Mojo.Event.propertyChange, this.weekItemTappedHandler );
		Mojo.Event.listen( this.controller.get( 'repeatUntil' ), Mojo.Event.propertyChange, this.repeatUntilHandler );
	},

	handleCommand: function( event ) {

		if( event.type === Mojo.Event.command ) {

			switch( event.command ) {

				case 'return':
					this.controller.stageController.popScene();
					event.stop();
					break;
			}
		}
	},

	weekItemTapped: function() {

		if( this.howOftenModel.value === $L( "week(s)" ) ) {

			this.controller.get( "repeatFreqDrawer" ).mojo.setOpenState( true );
		} else {

			this.controller.get( "repeatFreqDrawer" ).mojo.setOpenState( false );
		}

		if( this.howOftenModel.value === "" ) {

			this.controller.get( "repeatUntilGroup" ).mojo.setOpenState( false );
			this.controller.get( "spanPickerDrawer" ).mojo.setOpenState( false );

			Element.removeClassName( this.controller.get( "repeatFreqRow" ), "first" );
			Element.addClassName( this.controller.get( "repeatFreqRow" ), "single" );

		} else {

			this.controller.get( "repeatUntilGroup" ).mojo.setOpenState( true );
			this.controller.get( "spanPickerDrawer" ).mojo.setOpenState( true );

			Element.removeClassName( this.controller.get( "repeatFreqRow" ), "single" );
			Element.addClassName( this.controller.get( "repeatFreqRow" ), "first" );
		}

		this.controller.get( 'spanInterval' ).update( this.howOftenModel.value );
	},

	repeatUntil: function() {

		switch( this.endingConditionModel.value ) {
			case 'd':
				this.controller.get( "repeatUntilDateDrawer" ).mojo.setOpenState( true );
				this.controller.get( "repeatUntilCountDrawer" ).mojo.setOpenState( false );
				break;
			case 'o':
				this.controller.get( "repeatUntilDateDrawer" ).mojo.setOpenState( false );
				this.controller.get( "repeatUntilCountDrawer" ).mojo.setOpenState( true );
				break;
			default:
				this.controller.get( "repeatUntilDateDrawer" ).mojo.setOpenState( false );
				this.controller.get( "repeatUntilCountDrawer" ).mojo.setOpenState( false );
		}
	},

	deactivate: function() {

		Mojo.Event.stopListening( this.controller.get( 'repeatFreq' ), Mojo.Event.propertyChange, this.weekItemTappedHandler );
		Mojo.Event.stopListening( this.controller.get( 'repeatUntil' ), Mojo.Event.propertyChange, this.repeatUntilHandler );

		//build vars and update old scenes information
		if( this.howOftenModel.value !== "" ) {

			this.repeatFrequency = this.howOftenModel.value;

			this.dailyRepeat.each(
					function( dayItem ) {

						this.repeatDaysOfWeek[dayItem.day] = dayItem.model.value;
					}, this );

			this.repeatItemSpan = this.spanModel.value;

			this.repeatEndingCondition = this.endingConditionModel.value;

			this.sceneAssistantParent.repeatTrsn.frequency = this.repeatFrequency;
			this.sceneAssistantParent.repeatTrsn.daysOfWeek = this.repeatDaysOfWeek;
			this.sceneAssistantParent.repeatTrsn.itemSpan = this.repeatItemSpan;
			this.sceneAssistantParent.repeatTrsn.endingCondition = this.repeatEndingCondition;

			this.sceneAssistantParent.repeatTrsn.endDate = Date.parse( this.repeatUntilDateModel.date.toDateString() + " 23:59:59" );
			this.sceneAssistantParent.repeatTrsn.endCount = this.repeatUntilCountModel.value;
		} else {

			this.sceneAssistantParent.repeatTrsn.frequency = "";
			this.sceneAssistantParent.repeatTrsn.daysOfWeek = "";
			this.sceneAssistantParent.repeatTrsn.itemSpan = "";
			this.sceneAssistantParent.repeatTrsn.endingCondition = "";

			this.sceneAssistantParent.repeatTrsn.endDate = "";
			this.sceneAssistantParent.repeatTrsn.endCount = "";
		}
	},

	cleanup: function() {
	}
} );
