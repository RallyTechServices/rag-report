Ext.define("CArABU.app.TSApp", {
    extend: 'Rally.app.App',
    componentCls: 'app',
    logger: new CArABU.technicalservices.Logger(),
    // defaults: { margin: 10 },
    // layout: 'border',

    items: [
        {xtype: 'container', itemId: 'selector_box', layout: 'hbox'},
        {xtype: 'container', itemId: 'display_box' }
    ],

    integrationHeaders : {
        name : "CArABU.app.TSApp"
    },

    launch: function() {
        var me = this;
        //this.setLoading("Loading stuff...");

        me.logger.setSaveForLater(me.getSetting('saveLog'));

        me.down('#selector_box').add({            
            xtype: 'rallyreleasecombobox',
            fieldLabel: 'Select a Release:',
            margin: 10,
            listeners: {
                scope: me,
                change: function(cb) {
                    me._updateData(cb.getRecord());
                }
            }
        });

        // Deft.Chain.sequence([
        //     function() {
        //         return TSUtilities.loadAStoreWithAPromise('Defect',['Name','State']);
        //     },
        //     function() {
        //         return TSUtilities.loadWsapiRecords({
        //             model:'Defect',
        //             fetch: ['Name','State']
        //         });
        //     }
        // ]).then({
        //     scope: this,
        //     success: function(results) {
        //         var store = results[0];
        //         var defects = results[1];
        //         var field_names = ['Name','State'];

        //         this._displayGridGivenStore(store,field_names);
        //         this._displayGridGivenRecords(defects,field_names);
        //     },
        //     failure: function(error_message){
        //         alert(error_message);
        //     }
        // }).always(function() {
        //     me.setLoading(false);
        // });
    },


    _updateData: function(release){
        console.log(release);
        var me = this;
        var perfField = me.getSetting('perfCommentaryField');
        /*
           var epics = {'MyNYL' : {
                            'Name': 'MyNYL',
                            'MBI': [{
                                'Name':'MBI Test1',
                                'DeployDate': '1/1/19',
                                'RagColor': 'green'
                            },{
                                'Name':'MBI Test2',
                                'DeployDate': '1/2/19',
                                'RagColor': 'red'
                            }],
                            'PerfCommentary' : 'Rich text'
                       },
                       {
                
                       }
                       };
        */
        var epics = [];
        TSUtilities.loadWsapiRecords({
                    model:'PortfolioItem/MBI',
                    fetch: ['Name','Parent','PlannedEndDate','Children','Release','Notes','PercentDoneByStoryCount','ActualStartDate','PlannedStartDate','ActualEndDate','PlannedEndDate',perfField],
                    filters: [{property:'Children.Release.Name',value:release.get('Name')}]
                }).then({
                    scope: me,
                    success: function(results){
                        console.log(results);
                        // Ext.Array.each(results,function(mbi){
                        //     if(mbi.get('Parent')){
                        //         if(epics[mbi.get('Parent').Name]){
                        //             epics[mbi.get('Parent').Name].MBI.push({
                        //                 'Name': mbi.get('Name'),
                        //                 'DeployDate': mbi.get('PlannedEndDate'),
                        //                 'RagColor': me._getRAGColor(mbi)                                        
                        //             })
                        //         }else{
                        //             epics[mbi.get('Parent').Name] = {
                        //                 'Name' : mbi.get('Parent').Name,
                        //                 'MBI': [{
                        //                     'Name': mbi.get('Name'),
                        //                     'DeployDate': mbi.get('PlannedEndDate'),
                        //                     'RagColor': me._getRAGColor(mbi)
                        //                 }],
                        //                 'PerfCommentary' : mbi.get('Parent').c_PerfCommentary
                        //             }                                       
                        //         }                                
                        //     }
                        // });
                        // console.log(epics);

                        Ext.Array.each(results,function(mbi){
                            if(mbi.get('Parent')){
                                epics.push({
                                    'EpicName' : mbi.get('Parent').Name,
                                    'Name': mbi.get('Name'),
                                    'DeployDate': mbi.get('PlannedEndDate'),
                                    'RagColor': me._getRAGColor(mbi),
                                    'PerfCommentary' : mbi.get('Parent')[perfField]
                                });                                    
                            }
                        });

                        me._renderReport(epics,release);
                    }
                });
    },

    _renderReport:function(epics,release){
        me = this;
        var data = [];

        // _.each(epics,function(val,key){
        //     data.push({
        //         html: val.Name,
        //         rowspan: val.MBI.length
        //     })
        //     _.each(val.MBI, function(mbi){
        //         data.push({
        //             html: mbi.RagColor
        //         });
        //         data.push({
        //             html: mbi.Name
        //         });
        //         data.push({
        //             html: mbi.DeployDate
        //         });
        //     })
        //     data.push({
        //         html: val.PerfCommentary || 'NA'
        //     });            
        // })
        var asOfDay = new Date();
        var table_title = "Service Experience " + release.get('Name') + " ( " + Ext.Date.format(release.get('ReleaseStartDate'),'m/d' ) + " - " + Ext.Date.format(release.get('ReleaseDate'),'m/d' ) + " ) as of " +  Ext.Date.format(asOfDay,'m/d/Y' );

        var store = Ext.create('Rally.data.custom.Store', {
            data: epics,
            pageSize: 2000
        });

        me.down('#display_box').removeAll();
        me.down('#display_box').add({
                            xtype                : 'rallygrid',
                            itemId               : 'reportGrid',
                            title                : table_title, 
                            titleAlign           : 'center',
                            sortableColumns      : true,
                            showRowActionsColumn : false,
                            showPagingToolbar    : false,
                            columnCfgs           : me._getColumns(),
                            store : store
                        });


    },

    //https://help.rallydev.com/track-portfolio-items#coloralg
    _getRAGColor: function(pi){
        
        // #  Inputs:
        // #    percentComplete (real)
        // #    startDate (days since the epoch or date type where
        // #      Tomorrow()-Today() = 1.0 (real))
        // #    endDate (same type as startDate)
        // #    asOfDate (same type as startDate) - Most often today. The naming of 
        // #      this variable supports the idea that you may want to look
        // #      at the report as-of a certain date. All A2.0 reports will
        // #      support printing any report as-of a certain timestamp.
        // #    acceptanceStartDelay (real representing days) - delay before any
        // #      any movement off of 0% complete is expected
        // #    warningDelay (real representing days) - width of yellow
        // #    inProgress (boolean)

        // #  Colors:
        // #    Red - Late
        // #    Green - On Track
        // #    Yellow - At Risk
        // #    White - Not Started
        // #    Light Gray - Some Work Accepted Prior to Start Date
        // #    Gray - Complete

        // # Input parameters for Portfolio Items are calculated as below. 
        // # They could be different for Epics
        // asOfDay = <today>
        // # percentDoneFieldName in the line below could be:
        // #   PercentDoneByStoryCount or PercentDoneByStoryPlanEstimate
        // Fetch : PercentDoneByStoryCount,ActualStartDate,PlannedStartDate,ActualEndDate,PlannedEndDate
        var percentComplete = 100 * pi.get('PercentDoneByStoryCount');

        var asOfDay = new Date();
        var startDate = asOfDay;

        if (pi.get('ActualStartDate') != null){
          startDate = pi.get('ActualStartDate');
        }else if (pi.get('PlannedStartDate') != null){
          startDate = pi.get('PlannedStartDate');
        }

        var endDate = asOfDay;
        if (pi.get('PercentDoneByStoryCount') == 1){
            if (pi.get('ActualEndDate') != null){
              endDate = pi.get('ActualEndDate');
            }else if (pi.get('PlannedEndDate') != null){
              endDate = pi.get('PlannedEndDate');
            }            
              
        }else{
            if (pi.get('PlannedEndDate') != null){
              endDate = pi.get('PlannedEndDate');
            }         
        }


        // Defaults below currently hard-coded. Could later be provided by user.
        var acceptanceStartDelay = (endDate - startDate) * 0.2
        var warningDelay = (endDate - startDate) * 0.2
        var inProgress = percentComplete > 0

        if (asOfDay < startDate){
          return 'white';
        }
           
        if (asOfDay >= endDate){
          if (percentComplete >= 100.0)
            return 'gray';
          else
            return 'red';
        }

        var redXIntercept = startDate + acceptanceStartDelay + warningDelay;
        var redSlope = 100.0 / (endDate - redXIntercept);
        var redYIntercept = -1.0 * redXIntercept * redSlope
        var redThreshold = redSlope * asOfDay + redYIntercept
        if (percentComplete < redThreshold){
          return 'red';
        }
          
        var yellowXIntercept = startDate + acceptanceStartDelay;
        var yellowSlope = 100 / (endDate - yellowXIntercept);
        var yellowYIntercept = -1.0 * yellowXIntercept * yellowSlope;
        var yellowThreshold = yellowSlope * asOfDay + yellowYIntercept;
        if(percentComplete < yellowThreshold){
          return 'yellow';
        }
          
        return 'green';
    },


    _getColumns: function(){
        return [
            {
                dataIndex : 'EpicName',
                text: "Project",
                flex: 2,
                renderer  : function (value, meta, record, rowIndex, colIndex, store) {
                 
                console.log(!rowIndex);
                var first = !rowIndex || value !== store.getAt(rowIndex - 1).get('EpicName'), 
                  last = rowIndex >= store.getCount() - 1 || value !== store.getAt(rowIndex + 1).get('EpicName'); 

                if (first) { 
                  var i = rowIndex + 1, span = 1; 
                  while (i < store.getCount() && value === store.getAt(i).get('EpicName')) { 
                    i++; 
                    span++; 
                  } 
                  var rowHeight = 20, padding = 6, 
                    height = (rowHeight * (i - rowIndex) - padding) + 'px'; 
                  meta.style = 'height:' + height + ';line-height:' + height + ';'; 
                  meta.tdAttr = 'rowspan = ' + span; 
                } 
                else{ 
                  meta.tdAttr='style="display:none;"'; 
                } 
                return first ? value : ''; 
              } 
            },
            {
                dataIndex : 'RagColor',
                text: "",
                flex: 1,
                renderer: function (value, meta, record, rowIndex, colIndex, store) {
                    meta.tdAttr='style="background-color:'+value+';"'; 
                }
            },
            {
                dataIndex : 'Name',
                text: "MBIs",
                flex: 3
            },
            {
                dataIndex : 'DeployDate',
                text: "Deploy",
                flex: 2,
                renderer: function(value){
                    return value ? Ext.Date.format(value,'m/d' ) : '-';
                }
            },
            {
                dataIndex : 'PerfCommentary',
                text: "Performance Commentary",
                flex: 4,
                renderer  : function (value, meta, record, rowIndex, colIndex, store) {
                 
                    console.log(!rowIndex);
                    var first = !rowIndex || value !== store.getAt(rowIndex - 1).get('PerfCommentary'), 
                      last = rowIndex >= store.getCount() - 1 || value !== store.getAt(rowIndex + 1).get('PerfCommentary'); 

                    if (first) { 
                      var i = rowIndex + 1, span = 1; 
                      while (i < store.getCount() && value === store.getAt(i).get('PerfCommentary')) { 
                        i++; 
                        span++; 
                      } 
                      var rowHeight = 20, padding = 6, 
                        height = (rowHeight * (i - rowIndex) - padding) + 'px'; 
                      //meta.style = 'height:' + height + ';line-height:' + height + ';'; 
                      meta.tdAttr = 'rowspan = ' + span; 
                    } 
                    else{ 
                      meta.tdAttr='style="display:none;"'; 
                    } 
                    return first ? value : ''; 
                  } 
            }
        ]
    },

    _displayGridGivenStore: function(store,field_names){
        this.down('#grid_box1').add({
            xtype: 'rallygrid',
            store: store,
            columnCfgs: field_names
        });
    },

    _displayGridGivenRecords: function(records,field_names){
        var store = Ext.create('Rally.data.custom.Store',{
            data: records
        });

        var cols = Ext.Array.map(field_names, function(name){
            return { dataIndex: name, text: name, flex: 1 };
        });
        this.down('#grid_box2').add({
            xtype: 'rallygrid',
            store: store,
            columnCfgs: cols
        });
    },

    getSettingsFields: function() {
        var check_box_margins = '5 0 5 0';
        return [{
            name: 'saveLog',
            xtype: 'rallycheckboxfield',
            boxLabelAlign: 'after',
            fieldLabel: '',
            margin: check_box_margins,
            boxLabel: 'Save Logging<br/><span style="color:#999999;"><i>Save last 100 lines of log for debugging.</i></span>'

        },
        {
            name: 'perfCommentaryField',
            itemId:'perfCommentaryField',
            xtype: 'rallyfieldcombobox',
            fieldLabel: 'Performance Commentary',
            labelWidth: 125,
            labelAlign: 'left',
            minWidth: 200,
            margin: '10 10 10 10',
            model: 'PortfolioItem/Epic',
            allowBlank: false
        }];
    },

    getOptions: function() {
        var options = [
            {
                text: 'About...',
                handler: this._launchInfo,
                scope: this
            }
        ];

        return options;
    },

    _launchInfo: function() {
        if ( this.about_dialog ) { this.about_dialog.destroy(); }

        this.about_dialog = Ext.create('Rally.technicalservices.InfoLink',{
            showLog: this.getSetting('saveLog'),
            logger: this.logger
        });
    },

    isExternal: function(){
        return typeof(this.getAppId()) == 'undefined';
    }

});
