/* Copyright 2009 and forward GlitchTech Science. All rights reserved. */

var ReportSystemCategoryPieAssistant = Class.create( commonModel, {

	initialize: function( $super ) {

		$super();

		this.planStart = null;
		this.planEnd = null;
		this.categoryFilter = null;
		this.accountFilter = null;

		this.currentState = 0;

		this.itemTappedEvent = this.itemTapped.bindAsEventListener( this );
		this.pieKeyListTapHandler = this.pieKeyListTap.bindAsEventListener( this );
	},

	setup: function() {

		//False model data
		this.dataModel = {
			items: [],
			centerX: 0,
			centerY: 0,
			radius: 0
		};

		//Prepare attribute data
		this.dataAttr = {
			itemTemplate: 'report-system-category-pie/report-system-category-pie-item',
			swipeToDelete: false,
			reorderable: false
		};

		this.controller.setupWidget( 'pieKey', this.dataAttr, this.dataModel );

		this.setupLoadingSystem();

		var reportCatPieCmdButtons = {
			visible: true,
			items: [
				{
					items: [
						{
							icon:'back',
							command:'dateSetBack'
						}, {
							icon:'forward',
							command:'dateSetForward'
						},
					]
				}, {
					icon: 'search',
					command: 'search'
				}
			]
		};

		this.controller.setupWidget( Mojo.Menu.commandMenu, {}, reportCatPieCmdButtons );

		var reportCatPieMenuModel = {
								visible: true,
								items: [
									Mojo.Menu.editItem,
									appMenuPrefAccountsDisabled,
									appMenuFeaturesDisabled,
									cbAboutItem,
									cbHelpItem
								]
							};

		this.controller.setupWidget( Mojo.Menu.appMenu, appMenuOptions, reportCatPieMenuModel );
	},

	ready: function() {

		var currDate = new Date();

		//Month 1st at 12:00:00am
		currDate.setDate( 1 );
		this.planStart = Date.parse( currDate.toDateString() + " 00:00:00" );

		//Month Today at 11:59:59pm
		currDate = new Date();
		currDate.setDate( daysInMonth( currDate.getMonth(), currDate.getFullYear() ) );
		this.planEnd = Date.parse( currDate.toDateString() + " 23:59:59" );

		this.updateLoadingSystem( true, $L( "Retrieving Data" ), $L( "Please wait..." ), 0 );

		this.startSpinner();

		//Fetch primary categories
		this.fetchGeneralCats();
	},

	//500ms before activate
	aboutToActivate: function() {
	},

	//Scene made visible
	activate: function( event ) {

		Mojo.Event.listen( this.controller.get( 'chartSpace' ), Mojo.Event.tap, this.itemTappedEvent );
		Mojo.Event.listen( this.controller.get( 'pieKey' ), Mojo.Event.listTap, this.pieKeyListTapHandler );
	},

	handleCommand: function( event ) {

		if( event.type === Mojo.Event.back ) {

			this.backCommand();
			event.stop();
		}

		if( event.type === Mojo.Event.command ) {

			switch ( event.command ) {
				case 'search':
					this.controller.showDialog(
							{
								template: 'dialogs/transaction-plan-span-dialog',
								assistant: new transactionTrendSpanDialog( this )
							}
						);
					event.stop();
					break;
				case 'dateSetBack':
					this.planStart = new Date( this.planStart );
					this.planStart.setMonth( this.planStart.getMonth() - 1 );
					this.planStart = Date.parse( this.planStart.toDateString() + " 00:00:00" );

					this.planEnd = new Date( this.planEnd );
					this.planEnd.setMonth( this.planEnd.getMonth() - 1 );
					this.planEnd = Date.parse( this.planEnd.toDateString() + " 23:59:59" );

					if( this.currentState === 0 ) {

						this.startSpinner();
						this.fetchGeneralCats();
					} else if( this.currentState === 1 ) {

						this.startSpinner();
						this.fetchSpecCats();
					}
					event.stop();
					break;
				case 'dateSetForward':
					this.planStart = new Date( this.planStart );
					this.planStart.setMonth( this.planStart.getMonth() + 1 );
					this.planStart = Date.parse( this.planStart.toDateString() + " 00:00:00" );

					this.planEnd = new Date( this.planEnd );
					this.planEnd.setMonth( this.planEnd.getMonth() + 1 );
					this.planEnd = Date.parse( this.planEnd.toDateString() + " 23:59:59" );

					if( this.currentState === 0 ) {

						this.startSpinner();
						this.fetchGeneralCats();
					} else if( this.currentState === 1 ) {

						this.startSpinner();
						this.fetchSpecCats();
					}
					event.stop();
					break;
			}
		}
	},

	backCommand: function() {

		if( this.currentState === 0 ) {

			var monthStart = new Date();
			var monthEnd = new Date();
			monthStart.setDate( 1 );
			monthEnd.setDate( daysInMonth( monthEnd.getMonth(), monthEnd.getFullYear() ) );

			if( this.planStart === Date.parse( monthStart.toDateString() + " 00:00:00" ) && this.planEnd === Date.parse( monthEnd.toDateString() + " 23:59:59" ) ) {

				this.controller.stageController.popScene();
			} else {

				this.planStart = Date.parse( monthStart.toDateString() + " 00:00:00" );
				this.planEnd = Date.parse( monthEnd.toDateString() + " 23:59:59" );

				this.startSpinner();
				this.fetchGeneralCats();
			}
		} else if( this.currentState === 1 ) {

			this.currentState = 0;

			this.categoryFilter = null;
			this.startSpinner();
			this.fetchGeneralCats();
		} else if( this.currentState === 2 ) {

			this.currentState = 1;

			this.startSpinner();
			this.fetchSpecCats();
		}
	},

	fetchBudget: function() {

		if( this.currentState === 0 ) {

			this.startSpinner();
			this.fetchGeneralCats();
		} else if( this.currentState === 1 ) {

			this.startSpinner();
			this.fetchSpecCats();
		} else if( this.currentState === 2 ) {
		}
	},

	fetchGeneralCats: function() {

		this.controller.get( 'report-system-category-pie-header-content' ).update( $L( "Category Report: Overview" ) );

		this.currentState = 0;

		//Initially fetch all spending categories in the current month
		var qryGenCats = "SELECT DISTINCT genCat FROM transactionCategories;";

		accountsDB.transaction( ( function( transaction ) {

			transaction.executeSql( qryGenCats, [], this.generalCatsHandler.bind( this ), this.fetchError.bind( this, qryGenCats ) );
		} ).bind( this ) );
	},

	generalCatsHandler: function( transaction, results ) {

		this.updateLoadingSystem( true, $L( "Processing Data" ), $L( "Building models..." ), 0 );

		if( this.dataModel['items'].length > 0 ) {

			this.dataModel['items'].clear();
		}

		for ( var i = 0; i < results.rows.length; i++ ) {

			var row = results.rows.item( i );

			this.dataModel['items'].push( {
				"key": "",
				"name": row['genCat'],
				"percent": "",
				"amount": "",
				"map": {}
			} );

			this.updateProgressBar( ( i + 1 / results.rows.length ) / 3 );
		}

		if( this.dataModel['items'].length <= 0 ) {

			this.backCommand();
		}

		this.updateLoadingSystem( true, $L( "Processing Data" ), $L( "Building report..." ), 0 );

		var qryCount = "SELECT IFNULL( ABS( SUM( amount ) ), 0 ) AS itemCount FROM transactions WHERE category LIKE ? AND CAST( date AS INTEGER ) >= ? AND CAST( date AS INTEGER ) <= ? AND amount <= 0 AND IFNULL( LENGTH( linkedRecord ), 0 ) <= 0;";

		accountsDB.transaction( ( function( transaction ) {

			transaction.executeSql( qryCount, [this.dataModel['items'][0]['name'], this.planStart, this.planEnd], this.catCountHandler.bind( this, 0 ), this.fetchError.bind( this, qryCount ) );
		} ).bind( this ) );
	},

	catCountHandler: function( iCurr, transaction, result ) {

		if( result.rows.length > 0 ) {

			this.dataModel['items'][iCurr]['amount'] = result.rows.item( 0 )['itemCount'];
		} else {

			this.dataModel['items'][iCurr]['amount'] = 0;
		}

		if( this.dataModel['items'][iCurr]['amount'] <= 0 ) {

			this.dataModel['items'].splice( iCurr, 1 );
		} else {

			iCurr += 1;
		}

		this.updateProgressBar( ( 1 + ( iCurr / this.dataModel['items'].length ) ) / 3 );

		if( iCurr < this.dataModel['items'].length ) {

			var qryCount = "SELECT IFNULL( ABS( SUM( amount ) ), 0 ) AS itemCount FROM transactions WHERE category LIKE ? AND CAST( date AS INTEGER ) >= ? AND CAST( date AS INTEGER ) <= ? AND amount <= 0 AND IFNULL( LENGTH( linkedRecord ), 0 ) <= 0;";

			accountsDB.transaction( ( function( transaction ) {

				transaction.executeSql( qryCount, [this.dataModel['items'][iCurr]['name'], this.planStart, this.planEnd], this.catCountHandler.bind( this, iCurr ), this.fetchError.bind( this, qryCount ) );
			} ).bind( this ) );
		} else {

			this.dataModel['items'].sort( this.sortData );

			this.buildPieChart();
		}
	},

	fetchSpecCats: function() {

		this.controller.get( 'report-system-category-pie-header-content' ).update( $L( "Category Report: " ) + this.categoryFilter );

		this.currentState = 1;

		accountsDB.transaction( ( function( transaction ) {

			var qrySpecCats = "SELECT DISTINCT specCat FROM transactionCategories WHERE genCat = ?;";

			transaction.executeSql( qrySpecCats, [this.categoryFilter], this.specCatsHandler.bind( this ), this.fetchError.bind( this, qrySpecCats ) );
		} ).bind( this ) );
	},

	specCatsHandler: function( transaction, results ) {

		this.updateLoadingSystem( true, $L( "Processing Data" ), $L( "Building models..." ), 0 );

		if( this.dataModel['items'].length > 0 ) {

			this.dataModel['items'].clear();
		}

		for ( var i = 0; i < results.rows.length; i++ ) {

			var row = results.rows.item( i );

			this.dataModel['items'].push( {
				"key": "",
				"name": row['specCat'],
				"percent": "",
				"amount": "",
				"map": {}
			} );

			this.updateProgressBar( ( i + 1 / results.rows.length ) / 3 );
		}

		if( this.dataModel['items'].length <= 0 ) {

			this.backCommand();
		}

		this.updateLoadingSystem( true, $L( "Processing Data" ), $L( "Building report" ), 0 );

		var qryCount = "SELECT IFNULL( ABS( SUM( amount ) ), 0 ) AS itemCount FROM transactions WHERE category LIKE ? AND category2 LIKE ? AND CAST( date AS INTEGER ) >= ? AND CAST( date AS INTEGER ) <= ? AND amount <= 0 AND IFNULL( LENGTH( linkedRecord ), 0 ) <= 0;";

		accountsDB.transaction( ( function( transaction ) {

			transaction.executeSql( qryCount, [this.categoryFilter, this.dataModel['items'][0]['name'], this.planStart, this.planEnd], this.specCatCountHandler.bind( this, 0 ), this.fetchError.bind( this, qryCount ) );
		} ).bind( this ) );
	},

	specCatCountHandler: function( iCurr, transaction, result ) {

		if( result.rows.length > 0 ) {

			this.dataModel['items'][iCurr]['amount'] = result.rows.item( 0 )['itemCount'];
		} else {

			this.dataModel['items'][iCurr]['amount'] = 0;
		}

		if( this.dataModel['items'][iCurr]['amount'] <= 0 ) {

			this.dataModel['items'].splice( iCurr, 1 );
		} else {

			iCurr += 1;
		}

		this.updateProgressBar( ( 1 + ( iCurr / this.dataModel['items'].length ) ) / 3 );

		if( iCurr < this.dataModel['items'].length ) {

			var qryCount = "SELECT IFNULL( ABS( SUM( amount ) ), 0 ) AS itemCount FROM transactions WHERE category LIKE ? AND category2 LIKE ? AND CAST( date AS INTEGER ) >= ? AND CAST( date AS INTEGER ) <= ? AND amount <= 0 AND IFNULL( LENGTH( linkedRecord ), 0 ) <= 0;";

			accountsDB.transaction( ( function( transaction ) {

				transaction.executeSql( qryCount, [this.categoryFilter, this.dataModel['items'][iCurr]['name'], this.planStart, this.planEnd], this.specCatCountHandler.bind( this, iCurr ), this.fetchError.bind( this, qryCount ) );
			} ).bind( this ) );
		} else {

			this.dataModel['items'].sort( this.sortData );

			this.buildPieChart();
		}
	},

	buildPieChart: function() {

		this.updateLoadingSystem( true, $L( "Processing Data" ), $L( "Creating graphics..." ), 0 );

		var canvas = this.controller.get( "chartSpace" );
		var g = canvas.getContext( "2d" );


		if( this.dataModel['items'].length <= 0 ) {

			g.fillStyle = "#e4e4e2";

			g.fillRect( 0, 0, 320, 320 );
			g.clearRect( 0, 0, 320, 320 );

			g.lineWidth = 1;
			g.fillStyle = "#000000";
			g.strokeStyle = "#000000";
			g.font = "15px Prelude";

			g.fillText( $L( "No information available for this time span." ), 15, 25 );
		} else {

			g.fillStyle = "#e4e4e2";

			g.clearRect( 0, 0, 320, 320 );
			g.fillRect( 0, 0, 320, 320 );

			g.lineWidth = 1;
			g.strokeStyle = "#000000";
			g.font = "15px Prelude";

			var cx = 160;
			var cy = 160;
			var r = 140;

			this.dataModel['centerX'] = cx;
			this.dataModel['centerY'] = cy;
			this.dataModel['radius'] = r;

			var total = 0;
			for ( var i = 0; i < this.dataModel['items'].length; i++ ) {

				total += parseInt( this.dataModel['items'][i]['amount'] );

				this.updateProgressBar( ( 2 + ( ( ( i + 1 ) / this.dataModel['items'].length ) / 3 ) ) / 3 );
			}

			var angles = []
			for ( var i = 0; i < this.dataModel['items'].length; i++ ) {

				angles[i] = parseInt( this.dataModel['items'][i]['amount'] ) / total * Math.PI * 2;

				this.updateProgressBar( ( 2 + ( ( 1 + ( i + 1 ) / this.dataModel['items'].length ) / 3 ) ) / 3 );
			}

			var theta1 = -Math.PI / 2;

			for ( var i = 0; i < this.dataModel['items'].length; i++ ) {

				var theta2 = theta1 + angles[i];

				g.beginPath();

				//Needed for webOS canvas
				var x0 = ( cx + r * Math.sin( theta1 + ( Math.PI / 2 ) ) );
				var y0 = ( cy - r * Math.cos( theta1 + ( Math.PI / 2 ) ) );

				g.moveTo( cx, cy );
				g.lineTo( x0, y0 );
				g.arc( cx, cy, r, theta1, theta2, false );
				g.lineTo( cx, cy );
				g.moveTo( cx, cy );

				g.closePath();

				this.dataModel['items'][i]['key'] = i + 1;
				this.dataModel['items'][i]['percent'] = Math.round( ( this.dataModel['items'][i]['amount'] / total ) * 1000 ) / 10;
				this.dataModel['items'][i]['percent'] = ( this.dataModel['items'][i]['percent'] > 100 ? 100 : this.dataModel['items'][i]['percent'] );
				this.dataModel['items'][i]['color'] = this.getColor( i, this.dataModel['items'].length );

				g.fillStyle = this.dataModel['items'][i]['color'];

				g.fill();
				g.stroke();

				if( this.dataModel['items'][i]['amount'] > 0 ) {

					var x1 = 0;
					var y1 = 0;

					if( ( this.dataModel['items'][i]['amount'] / total ) >= 0.015 ) {

						x1 = ( cx + ( 0.9 * r ) * Math.sin( ( ( theta1 + theta2 ) / 2 ) + ( Math.PI / 2 ) ) ) - ( g.measureText( i + 1 ).width / 2 );
						y1 = ( cy - ( 0.9 * r ) * Math.cos( ( ( theta1 + theta2 ) / 2 ) + ( Math.PI / 2 ) ) ) + 7;
					} else {

						var x2 = 0;
						var x3 = 0;
						var y2 = 0;
						var y3 = 0;

						x1 = ( cx + ( 1.1 * r ) * Math.sin( ( ( theta1 + theta2 ) / 2 ) + ( Math.PI / 2 ) ) ) - ( g.measureText( i + 1 ).width / 2 );
						y1 = ( cy - ( 1.1 * r ) * Math.cos( ( ( theta1 + theta2 ) / 2 ) + ( Math.PI / 2 ) ) ) + 7;

						x2 = ( cx + r * Math.sin( ( ( theta1 + theta2 ) / 2 ) + ( Math.PI / 2 ) ) );
						y2 = ( cy - r * Math.cos( ( ( theta1 + theta2 ) / 2 ) + ( Math.PI / 2 ) ) );

						x3 = ( cx + ( 1.05 * r ) * Math.sin( ( ( theta1 + theta2 ) / 2 ) + ( Math.PI / 2 ) ) );
						y3 = ( cy - ( 1.05 * r ) * Math.cos( ( ( theta1 + theta2 ) / 2 ) + ( Math.PI / 2 ) ) );

						g.moveTo( x2, y2 );
						g.lineTo( x3, y3 );

						g.stroke();
					}

					g.fillStyle = "#000000";
					g.fillText( i + 1, x1, y1 );
					//g.fillText( this.dataModel['items'][i]['name'], x1, y1 );
				}

				this.dataModel['items'][i]['map'] = { 'theta1': theta1, 'theta2': theta2 };

				theta1 = theta2;

				//Format Amount
				this.dataModel['items'][i]['amount'] = formatAmount( this.dataModel['items'][i]['amount'] );

				this.updateProgressBar( ( 2 + ( ( 2 + ( i + 1 ) / this.dataModel['items'].length ) / 3 ) ) / 3 );
			}

		}

		this.controller.get( 'report-system-category-pie-filter-text' ).update( formatDate( new Date( this.planStart ), { date: "long", time: "" } ) + " to " + formatDate( new Date( this.planEnd ), { date: "long", time: "" } ) );

		this.updateProgressBar( 0.9 );

		//Update the list
		this.controller.get( 'pieKey' ).mojo.setLengthAndInvalidate( this.dataModel.items.length );
		this.controller.get( 'pieKey' ).mojo.noticeUpdatedItems( 0, this.dataModel.items.length );

		this.stopSpinner();
	},

	itemTapped: function( event ) {

		var tapX = event.down.layerX - this.dataModel['centerX'];
		var tapY = event.down.layerY - this.dataModel['centerY'];

		if( Math.sqrt( Math.pow( tapX, 2 ) + Math.pow( tapY, 2 ) ) <= this.dataModel['radius'] ) {

			var theta = 0;

			if( tapX > 0 ) {

				if( tapY >= 0 ) {

					theta = Math.atan( tapY / tapX );
				} else {

					theta = Math.atan( tapY / tapX ) + 2 * Math.PI;
				}
			} else if( tapX === 0 ) {

				if( tapY = 0 ) {

					theta = 0;
				} else if( tapY > 0 ) {

					theta = Math.PI / 2;
				} else {

					theta = -Math.PI / 2;
				}
			} else if( tapX < 0 ) {

				theta = Math.atan( tapY / tapX ) + Math.PI;
			}

			if( theta > ( 1.5 * Math.PI ) ) {

				theta = theta - Math.PI * 2
			}

			var i = 0;
			var sectionFound = -1;

			while( i < this.dataModel['items'].length && sectionFound < 0 ) {

				if( this.dataModel['items'][i]['map']['theta1'] <= theta && theta <= this.dataModel['items'][i]['map']['theta2'] ) {

					sectionFound = i;
					break;
				}

				i++;
			}

			if( sectionFound >= 0 ) {

				this.itemSelected( this.dataModel['items'][i] );
			}
		}
	},

	pieKeyListTap: function( event ) {

		this.itemSelected( event.item );
	},

	itemSelected: function( item ) {

		if( this.currentState === 0 ) {

			this.currentState = 1;

			this.categoryFilter = item['name'];
			this.fetchSpecCats();
		} else if( this.currentState === 1 ) {

			//this.currentState = 2;

			//transactions in general cat (should this go to search mode?)
			var searchArguments = {
					string: "",
					cleared: 2,
					startDate: new Date( this.planStart ),
					stopDate: new Date( this.planEnd ),
					category: this.categoryFilter,
					category2: item['name'],
					accounts: []
				};

			Mojo.Controller.getAppController().showBanner( $L( "System disabled, sorry." ), "", "cbNotice" );
			//this.controller.stageController.pushScene( "search-transactions", searchArguments, true );
		}
	},

	sortData: function( a, b ) {

		if( a['amount'] <= b['amount'] ) {

			return 1;
		} else
			if( a['amount'] >= b['amount'] ) {

				return -1;
			} else {

				return 0;
			}

	},

	startSpinner: function() {

		this.updateLoadingSystem( true, $L( "Report System" ), $L( "Please wait..." ), 0 );
	},

	stopSpinner: function() {

		this.updateLoadingSystem( false, "", "", 0 );
	},

	getColor: function( i, totalSteps ) {

		i = i + ( 1.5 * Math.PI );

		var freq = Math.PI * 2 / totalSteps;
		var amp = 60;
		var brightness = 200;

		var rgb = [Math.round( Math.sin( freq * i + 0 ) * amp + brightness ), Math.round( Math.sin( freq * i + 2 ) * amp + brightness ), Math.round( Math.sin( freq * i + 4 ) * amp + brightness )];

		return 'rgb( ' + rgb.join( ',' ) + ' )';
	},

	fetchError: function( fetchData, transaction, error ) {

		systemError( "Report Cat Pie Error: " + error.message + " ( Code " + error.code + " ) [" + fetchData + "]" );
	},

	deactivate: function( event ) {

		Mojo.Event.stopListening( this.controller.get( 'chartSpace' ), Mojo.Event.tap, this.itemTappedEvent );
		Mojo.Event.stopListening( this.controller.get( 'pieKey' ), Mojo.Event.listTap, this.pieKeyListTapHandler );
	},

	cleanup: function( event ) {
	}
} );
