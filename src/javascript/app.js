Ext.define("CArABU.app.TSApp", {
    extend: 'Rally.app.App',
    componentCls: 'app',
    logger: new CArABU.technicalservices.Logger(),

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
            fieldLabel: 'Select a PI:',
            margin: 10,
            listeners: {
                scope: me,
                change: function(cb) {
                    me._updateData(cb.getRecord());
                }
            }
        });
    },


    _updateData: function(release){
        console.log(release);
        var me = this;
        var perfField = me.getSetting('perfCommentaryField');
        var ragOverrideField = me.getSetting('ragOverrideField');
        var milestoneField = me.getSetting('prodMilestone');
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
        Deft.Promise.all([
            TSUtilities.loadWsapiRecords({
                    model:'PortfolioItem/MBI',
                    fetch: ['Name','Parent','PlannedEndDate','Children','Release','Notes','PercentDoneByStoryCount','ActualStartDate','PlannedStartDate','ActualEndDate','PlannedEndDate',perfField,'Milestones',ragOverrideField],
                    filters: [{property:'Children.Release.Name',value:release.get('Name')}]
                }),
            TSUtilities.loadWsapiRecords({
                    model:'Milestone',
                    fetch: ['ObjectID','Name','TargetDate'],
                    filters: [{property:milestoneField,value:true}]
                })
        ],me).then({
                    scope: me,
                    success: function(results){
                        console.log(results);
                        var milestone_oids = [];

                        Ext.Array.each(results[1],function(milestone){
                            milestone_oids.push(milestone.get('ObjectID'));
                        });



                        Ext.Array.each(results[0],function(mbi){
                            //
                            var milestones = mbi.get('Milestones') && mbi.get('Milestones')._tagsNameArray || [] ;
                            var deploy_date = null;
                            Ext.Array.each(milestones,function(m){
                                if(Ext.Array.contains(milestone_oids,Rally.util.Ref.getOidFromRef(m))){
                                    deploy_date = m.TargetDate;
                                }
                            })
                            if(mbi.get('Parent')){
                                epics.push({
                                    'EpicName' : mbi.get('Parent').Name,
                                    'Name': mbi.get('Name'),
                                    'DeployDate': deploy_date,
                                    'RagColor': me._getRAGColor(mbi),
                                    'PerfCommentary' : mbi.get('Parent')[perfField],
                                    'RagOverride' : mbi.get(ragOverrideField),
                                    'record':mbi
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

        var asOfDay = new Date();
        var table_title = me.getContext().getProject().Name + " " + release.get('Name') + " ( " + Ext.Date.format(release.get('ReleaseStartDate'),'m/d' ) + " - " + Ext.Date.format(release.get('ReleaseDate'),'m/d' ) + " ) as of " +  Ext.Date.format(asOfDay,'m/d/Y' );

        var store = Ext.create('Rally.data.custom.Store', {
            data: epics,
            pageSize: 2000,
            sorters: [{ property: 'EpicName' }],
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
          return 'White';
        }
           
        if (asOfDay >= endDate){
          if (percentComplete >= 100.0)
            return 'Blue';
          else
            return 'Red';
        }

        var redXIntercept = startDate + acceptanceStartDelay + warningDelay;
        var redSlope = 100.0 / (endDate - redXIntercept);
        var redYIntercept = -1.0 * redXIntercept * redSlope
        var redThreshold = redSlope * asOfDay + redYIntercept
        if (percentComplete < redThreshold){
          return 'Red';
        }
          
        var yellowXIntercept = startDate + acceptanceStartDelay;
        var yellowSlope = 100 / (endDate - yellowXIntercept);
        var yellowYIntercept = -1.0 * yellowXIntercept * yellowSlope;
        var yellowThreshold = yellowSlope * asOfDay + yellowYIntercept;
        if(percentComplete < yellowThreshold){
          return 'Yellow';
        }
          
        return 'Green';
    },


    _getColumns: function(){
        var me = this;
        var ragOverrideField = me.getSetting('ragOverrideField');

        return [
            {
                dataIndex : 'EpicName',
                text: "Project / EPIC",
                flex: 2,
                renderer  : function (value, meta, record, rowIndex, colIndex, store) {
                 
                // console.log(!rowIndex);
                var first = !rowIndex || value !== store.getAt(rowIndex - 1).get('EpicName'), 
                  last = rowIndex >= store.getCount() - 1 || value !== store.getAt(rowIndex + 1).get('EpicName'); 

                if (first) { 
                  var i = rowIndex + 1, span = 1; 
                  while (i < store.getCount() && value === store.getAt(i).get('EpicName')) { 
                    i++; 
                    span++; 
                  } 
                  var rowHeight = 25, padding = 0, 
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
                text: "Calculated <BR>Rag Status",
                flex: 1,
                renderer: function (value, meta, record, rowIndex, colIndex, store) {
                    meta.tdAttr='style="font: bold 24px;color:'+value+';"'; 
                    return value.slice(0,1)
                }
            },
            {
                dataIndex : 'RagOverride',
                text: "RAG Override",
                flex: 1,
                renderer: function (value, meta, record, rowIndex, colIndex, store) {
                    var value_arr = value && value.split(" ") || [];
                    var color = value_arr.length > 0 && value_arr[0] || 'White';
                    meta.tdAttr='style="background-color:'+CArABU.app.Colors.getColor(color.toLowerCase())+';"'; 
                }                
            },            
            {
                dataIndex : 'Name',
                text: "MBIs",
                flex: 3,
                renderer: function(value, meta, record, rowIndex, colIndex, store){
                    return Rally.nav.DetailLink.getLink({
                            record: record.get('record'),
                            text: value
                        });  
                }
            },
            {
                dataIndex : 'DeployDate',
                text: "Deploy",
                flex: 1,
                renderer: function(value){
                    return value ? Ext.Date.format(Rally.util.DateTime.fromIsoString(value),'m/d' ) : '-';
                }
            },
            {
                dataIndex : 'PerfCommentary',
                text: "Performance Commentary",
                flex: 4,                
                renderer  : function (value, meta, record, rowIndex, colIndex, store) {
                    //console.log(!rowIndex);
                    var first = !rowIndex || value !== store.getAt(rowIndex - 1).get('PerfCommentary'), 
                        last = rowIndex >= store.getCount() - 1 || value !== store.getAt(rowIndex + 1).get('PerfCommentary'); 

                        if (first) { 
                          var i = rowIndex + 1, span = 1; 
                          while (i < store.getCount() && value === store.getAt(i).get('PerfCommentary')) { 
                            i++; 
                            span++; 
                          } 
                          var rowHeight = 25, padding = 10, 
                            height = (rowHeight * (i - rowIndex) - padding) + 'px'; 
                          //meta.style = 'height:' + height + ';line-height:' + height + ';'; 
                          //meta.tdAttr = 'rowspan = ' + span; 
                          meta.tdAttr = 'rowspan = ' + span + ' style="border-left-color: grey;border-left-style: solid;border-left-width: thin;"'; 

                        } 
                        else{ 
                          //meta.tdAttr='style="display:none;"'; 
                          //meta.style = 'border-left-color: grey;border-left-style: solid;border-left-width: thin;';
                          meta.tdAttr = 'style="display:none;border-left-color: grey;border-left-style: solid;border-left-width: thin;"'; 
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

    config: {
        defaultSettings: {
            saveLog: false,
            perfCommentaryField: "c_RAGStatusCommentaryEpicOnly",
            prodMilestone: "c_ProductionRelease"
        }
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
            fieldLabel: 'Performance Commentary (Epic)',
            labelWidth: 125,
            labelAlign: 'left',
            minWidth: 200,
            margin: '10 10 10 10',
            model: 'PortfolioItem/Epic',
            allowBlank: false
        },        
        {
            name: 'ragOverrideField',
            itemId:'ragOverrideField',
            xtype: 'rallyfieldcombobox',
            fieldLabel: 'RAG Override (MBI)',
            labelWidth: 125,
            labelAlign: 'left',
            minWidth: 200,
            margin: '10 10 10 10',
            model: 'PortfolioItem/MBI',
            allowBlank: false
        },
        {
            name: 'prodMilestone',
            itemId:'prodMilestone',
            xtype: 'rallyfieldcombobox',
            fieldLabel: 'Production Milestone',
            labelWidth: 125,
            labelAlign: 'left',
            minWidth: 200,
            margin: '10 10 10 10',
            model: 'Milestone',
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
