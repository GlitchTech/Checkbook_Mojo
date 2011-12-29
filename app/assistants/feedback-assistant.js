/* Copyright 2009 and forward GlitchTech Science.  All rights reserved. */

var FeedbackAssistant = Class.create( commonModel, {

	initialize: function( $super ) {

		$super();
	},

	setup: function() {

		this.controller.setupWidget(
				"name",
				{
					hintText: $L( "optional" ),
					multiline: false
				},
				this.nameModel = { value : "" }
			);

		this.controller.setupWidget(
				"email",
				{
					multiline: false
				},
				this.emailModel = { value : "" }
			);

		this.controller.setupWidget(
				"response",
				{//Attributes
					trueValue: 1,
					trueLabel: $L( "Yes" ),
					falseValue: 0,
					falseLabel: $L( "No" )
				},
				this.responseModel = { value: 0 }
			);

		//Drop down

		this.controller.setupWidget(
				"type",
				{
					label: $L( "Type" ),
					choices: [
						{
							label: $L( "Leave a Comments" ),
							value: "Comment"
						}, {
							label: $L( "Report a Bug" ),
							value: "Bug"
						}, {
							label: $L( "Feature Request" ),
							value: "Request"
						}, {
							label: $L( "Other" ),
							value: "Other"
						}
					]
				},
				this.typeModel = { value: "Comment" }
			);

		this.controller.setupWidget(
				"feedback",
				{
					hintText: $L( "Comments or Notes" ) + "...",
					multiline: true
				},
				this.noteModel = { value: "" }
			);

		//Command menu button (Send, Cancel)

		this.setupLoadingSystem();
	},

	ready: function() {
	},

	aboutToActivate: function() {

		this.hideLoadingSystem();
	},

	activate: function() {
	},

	handleCommand: function( event ) {
	},

	submitFeedback: function() {

		this.updateLoadingSystem( true, $L( "Feedback System" ), $L( "Sending message..." ), 0 );

		this.feedbackSending = new Ajax.Request(
								"http://glitchtechscience.com/webOS/feedbackform.php?feedbackType=" + FEEDBACK_TYPE + "&location=feedback form&locale=" + Mojo.Locale.getCurrentLocale() + "&feedbackMessage=" + FEEDBACK_MESSAGE + "&feedbackEmail=" + FEEDBACK_EMAIL + "&cbFBindicator=cairo&feedbackNDUID=" + checkbookPrefs['nduid'] + "&feedbackappVersion=" + Mojo.Controller.appInfo.version,
								{
									method: 'post',
									evalJSON: 'false',
									onSuccess: this.submitFeedbackHandler.bind( this ),
									onFailure: this.submitFeedbackHandler.bind( this )
								}
							);
	},

	submitFeedbackHandler: function( response ) {
		//Success or fail, go here

		this.updateLoadingSystem( true, $L( "Feedback System" ), $L( "Message sent." ), 1 );

		//Show for 3 seconds then pop
		var closeFn = function() {

				this.controller.stageController.popScene();
			}.bind( this );

		var delayCloseFn = closeFn.delay( 3 );
	},

	deactivate: function() {
	},

	cleanup: function() {
	}
} );