/* Copyright 2009 and forward GlitchTech Science. All rights reserved. */

var StageAssistant = Class.create( {

	initialize: function() {

		this.launched = false;
	},

	setup: function() {

		/** Application Menu **/
		appMenuOptions = {
							omitDefaultItems: true,
							visible: true
						};

		appMenuPrefAccounts =  {
							label: $L( "Preferences & Data" ),
							items: [
								{
									label: $L( "Preferences & Accounts" ),
									command: "preferences"
								}, {
								//	label: $L( "Sync Data" ),
								//	command: "sync"
								//}, {
									label: $L( "Import Data" ),
									command: "import"
								}, {
									label: $L( "Export Data" ),
									command: "export"
								}
							]
						};

		appMenuPrefAccountsDisabled =  {
			label: $L( "Preferences & Data" ),
			command: "",
			disabled: true
		};

		appMenuFeatures = {
							label: $L( "Finance Information" ),
							items: [
								{
								//	label: $L( 'Search' ),
								//	command: 'search'
								//}, {
									label: $L( "Budget" ),
									command: "budget"
								}, {
									label: $L( "Reports" ),
									command: "reports"
								}
							]
						};

		appMenuFeaturesDisabled =  {
			label: $L( "Finance Information" ),
			command: "",
			disabled: true
		};

		cbHelpItem = {
			label: $L( "Help" ),
			command: "help"
		};

		cbAboutItem = {
			label: $L( "About" ),
			command: "about"
		};

		appMenuModel = {
							visible: true,
							items: [
								Mojo.Menu.editItem,
								appMenuPrefAccounts,
								appMenuFeatures,
								cbAboutItem,
								cbHelpItem
							]
						};
	},

	cleanup: function() {

		/** Kill Globals **/
		//Menu Items
		appMenuOptions = null;
		appMenuPrefAccounts = null;
		appMenuFeatures = null;
		cbHelpItem = null;
		cbAboutItem = null;

		appMenuModel = null;

		//DB Access
		accountsDB = null;

		//App Prefs
		checkbookPrefs = null;

		//Global Systems
		accountSortOptionsModel = null;
		accounts_obj = null;
	}
} );