if (typeof jQuery === 'undefined') { throw new Error('ajaxTables requiere jQuery') }
+(function($){
	var AjaxTables = function(){

	};
	AjaxTables.prototype.ajax = function(url,callback) {
		$.ajax({
			url:url,
			type:"POST",
			async:true,
			cache:false,
			dataType:'json',
			success:function(data,estado,xhr){
				callback(data);
			},
			error:function(xhr,estado,excepcion){
				if(xhr.status=='500'){
					// window.location.reload();
				}
			}
		});
	};
	AjaxTables.prototype.default = {
		obj: null,					/* INSTANCIA DEL OBJETO QUE SOLICITA EL PLUGIN */
		url:null, 					/* URL PARA LLAMADA AJAX */
		data:null,					/* OBJETO DE DATOS QUE SE ENVIA EN LA PETICION AJAX */
		columns:[],					/* ARRAY QUE DEFINE LAS COLUMNAS DEL DATATABLES Def:{name:string(Nombre de columna BD), title:string(titulo del encabezado), width:'150px'(ancho de columna), filter:{kind:'text,options,remoteOptions, date, rangeDates,custom', options:(optional)}, order:false, search:false, class:(classes to apply to cells),container:(optional, for tooltips), description:(text for tooltips,optional)} */
		topColumns:[],				/* ARRAY QUE DEFINE LA COLUMNA SUPERIOR DE ENCABEZADOS Def: {name:string, colspan:number} */
		orderDef:0,					/* COLUMNA QUE ORDENA POR DEFECTO LA TABLA */
		orderDefDir:'asc',			/* DIRECCION DEL ORDEN */
		pageCount:25,				/* CANTIDAD DE REGISTROS POR PANTALLA */
		onDraw:function(){}, 		/* FUNCION QUE SE EJECUTA DESPUES DE CONSTRUIR EL DATATABLES */
	};
	AjaxTables.prototype.init = function(obj,options) {
		options = $.extend({},this.default,options);
		options.obj = obj;

		var _this = this;
		this.buildTable(options,function(columns){
			var conf = {
				columns:columns,
				dom: "<'row'<'col-md-8 col-sm-12'pli><'col-md-4 col-sm-12'<'table-group-actions pull-right'>>r><'table-scrollable't><'row'<'col-md-8 col-sm-12'pli><'col-md-4 col-sm-12'>>",
				filterApplyAction: "filter",
                filterCancelAction: "filter_cancel",
                resetGroupActionInputOnSuccess: true,
                orderCellsTop: true,
		        processing: false,
		       	serverSide: true,
		       	autoWidth: false,
				order: [[options.orderDef, options.orderDefDir]],
				language: {
                    lengthMenu: "<span class='seperator'>|</span>Ver _MENU_ registros",
                    info: "<span class='seperator'>|</span> _TOTAL_ registro(s)",
                    infoEmpty: "No hay elementos disponibles",
                    emptyTable: "No hay datos disponibles",
                    zeroRecords: "No hay coincidencias para la búsqueda ingresada",
                    paginate: {
                        previous: "Anterior",
                        next: "Siguiente",
                       	last: "Último",
                        first: "Primero",
                        page: "Página",
                        pageOf: "de"
                    }
                },
                pageLength:options.pageCount,
		        pagingType: "bootstrap_extended",
		        lengthMenu: [[options.pageCount, 50, 100, -1], [options.pageCount, 50, 100, "Todos"]],
				ajax:{
					url:options.url,
					type:'POST',
					timeout:20000,
					data:function(d){
						if(typeof options.data!='undefined'){
	                		d['datos'] = options.data;
	                	}
	                	Metronic.blockUI({
	                        message: "CARGANDO...",
	                        target: $(options.obj),
	                        overlayColor: 'none',
	                        centerY: true,
	                        boxed: true
	                    });
					},
					dataSrc: function(res){
						Metronic.unblockUI($(options.obj));
	                    return res.data;
					},
					error:function(data){
						console.log(data);
					}
				},
				drawCallback:function(obj){
					_this.setNodeClass(obj,options);
					$('[data-toggle="dateTables"]').datepicker({
						language:'es',
						startDate:'-1y',
						endDate:'0d',
						weekStart:1,
						autoclose:true,
						todayHighlight:true
					});
					Apps.handleTooltip();
					options.onDraw(obj,options);
				}
			};
			$(options.obj).DataTable(conf);
			_this.filtersInit(obj,options);
			_this.setActions(obj,options);
		});
	};
	AjaxTables.prototype.buildTable = function(options,callback) {

		$obj = $(options.obj);
		$obj.empty();
		var _this = this;
		/*************** BUILD TOPCOLUMNS *************/
		if(typeof options.topColumns!='undefined' && options.topColumns.length>0){
			if($('thead',$obj).length==0){
				$obj.append( $('<thead>') );
			}
			$obj.find('thead').append( $('<tr>',{class:'topheading',role:'row',style:'background:#ddd;'}) );
			$.each(options.topColumns, function(i,v){
				$obj.find('tr.topheading').append(
					$('<th>',{text:v.name,colspan:v.colspan})
				);
			});
		}
		/************* BUILD COLUMNS *******************/
		if(options.columns.length>0){
			if($('thead',$obj).length==0){
				$obj.append( $('<thead>') );
			}
			$obj.find('thead').append(
				$('<tr>',{class:'heading',role:'row'}),
				$('<tr>',{class:'filters',role:'row'})
			);
			var columns = [];
			//construyo Encabezado
			$.each(options.columns, function(i,v){
				if(v.kind=='checkbox'){
					$obj.find('tr.heading').append(
						$('<th>',{class:v.class,style:((typeof v.width!='undefined')?'width:'+v.width+';':'')}).append(
							$('<input>',{type:'checkbox'})
						)
					);
				}else{
					$obj.find('tr.heading').append(
						$('<th>',{class:v.class,style:((typeof v.width!='undefined')?'width:'+v.width+';':''),"data-toggle":"tultip","title":v.description,"data-container":(typeof v.container!='undefined')?v.container:'body'}).append(v.title)
					);
				}
				//construyo filtros
				var filter = _this.setFilter(v,i);
				if(typeof v.filter!='undefined'){
					$obj.find('tr.filters').append(
						$('<th>',{class:v.class}).append(
							filter
						)
					);
				}else{
					$obj.find('tr.filters').append(
						$('<th>',{class:v.class,style:'background:#eee;'})
					);
				}

				columns.push({
					name:v.name,
					orderable:(typeof v.order!='undefined')?v.order:true,
					searchable:(typeof v.search!='undefined')?v.search:true
				});
			});
			callback(columns);
		}
	};
	AjaxTables.prototype.setFilter = function(obj,count) { //text,options,remoteOptions, date, rangeDates
		var _this = this;
		if(typeof obj.filter!='undefined' && typeof obj.filter.kind!='undefined'){
			switch(obj.filter.kind){
				case 'text': 				return _this.filterInput(obj,count); break;
				case 'options': 			return _this.filterOptions(obj,count); break;
				case 'remoteOptions': 		return _this.filterRemoteOptions(obj,count); break;
				case 'date': 				return _this.filterDate(obj,count); break;
				case 'rangeDates': 			return _this.filterRangeDates(obj,count); break;
				case 'custom':		return obj.filter.options; break;
			}
		}
	};
	/*********************** DEFINE FILTERS **********************************************/
	AjaxTables.prototype.filterInput = function(obj,count) {
		return $('<input>',{class:'form-control form-filter',type:'text',name:obj.name});
	};
	AjaxTables.prototype.filterOptions = function(obj,count) {
		var salida 	= '<select class="form-control form-filter" name="'+obj.name+'" placeholder="Seleccione..."><option value="">Todos</option>';
					if(obj.filter.options!=null && obj.filter.options.length>0){
						$.each(obj.filter.options,function(i,v){
							salida += '<option value="'+v.value+'" '+((typeof v.selected!='undefined')?'selected="'+v.selected+'"':'')+'>'+v.text+'</option>';

						});
					}
		salida	   += '</select>';
		return salida;
	};
	AjaxTables.prototype.filterRemoteOptions = function(obj,count) {
		if(obj.filter.url!=null && obj.filter.url!=''){
			var salida 	= '<select class="form-control form-filter" name="'+obj.name+'" placeholder="Seleccione..."><option value="">Todos</option></select>';
			this.ajax(obj.filter.url,function(data){
				console.log(data);
				if(data.result){
					$.each(data.data, function(i,v){
						$('tr.filters').find('select[name="'+obj.name+'"]').append(
							$('<option>',{value:v.value,text:v.text})
						);
					});
				}
			});
			salida	   += '</select>';
			return salida;
		}
	};
	AjaxTables.prototype.filterDate = function(obj,count) {
		return '<div class="input-group date date-picker" data-toggle="dateTablesSimple" data-date-format="dd/mm/yyyy">'+
					'<input type="text" class="form-control form-filter " data-name="'+obj.name+'" readonly name="fechaSearch" placeholder="Fecha">'+
					'<span class="input-group-btn">'+
					'<button class="btn  default" type="button"><i class="fa fa-calendar"></i></button>'+
					'<button class="btn  default delFilter" type="button"><i class="fa fa-times"></i></button>'+
					'</span>'+
				'</div>';
	};
	/*********************** CORE FUNCTIONS ***************************************/
	AjaxTables.prototype.setNodeClass = function(table,options) {
		var table = $(options.obj).DataTable();
		table.columns().flatten().each(function(id){
			if(typeof options.columns[id].class!='undefined'){
				table.column(id).nodes().to$().addClass(options.columns[id].class);
			}
		});
	};
	AjaxTables.prototype.filtersInit = function(obj,options) {
		var wrapper = $('tr.filters',$(options.obj));
		var tabla 	= $(options.obj).DataTable();
		/***FILTROS INPUT****/
		$.each($('input,select',wrapper),function(i,v){
			if(v.value!=''){
				if(typeof aux !== 'undefined'){
	                clearTimeout(aux);
				}
	            aux = setTimeout(function(){
	               tabla
		            .column( $(v).attr('name')+':name' )
		            .search( v.value )
		            .draw();
	        	},100);
			}
		});
		wrapper.find('input').die('keyup').live('keyup', function(e){
			var dis = $(this);
			var tabla = $('#'+dis.closest('table').attr('id')).DataTable();
			if(typeof aux !== 'undefined'){
                clearTimeout(aux);
			}
            aux = setTimeout(function(){
               tabla
	            .column( dis.attr('name')+':name' )
	            .search( dis.val() )
	            .draw();
        	},700);
        });
		/***FILTROS SELECT****/
		wrapper.find('select').die('change').live('change', function(e){
			var dis = $(this);
			var tabla = $('#'+dis.closest('table').attr('id')).DataTable();
			if(typeof aux !== 'undefined'){
                clearTimeout(aux);
			}
            aux = setTimeout(function(){
               tabla
	            .column( dis.attr('name')+':name' )
	            .search( dis.val() )
	            .draw();
        	},700);
        });
        /*********** MANEJA FECHA SIMPLE *************************/
		var sel = $('[data-toggle="dateTablesSimple"]');
		sel.find('.delFilter').die('click').live('click',function(e){
			$('.datepicker-dropdown').remove();
			$(this).parent().parent().find('input').attr('value','');
			$(this).parent().parent().find('input').trigger('changeDate');
		});
		sel.die('changeDate').live('changeDate',function(){
			var dis = $(this);
			if(dis.find('input').attr('value')==''){
				dis.datepicker('update');
			}
			var wrapper = dis.parent();
			var fecha = ($('input[name="fechaSearch"]',wrapper).val()!='')?$('input[name="fechaSearch"]',wrapper).val():'';

			if(typeof aux !== 'undefined'){
                clearTimeout(aux);
			}
			aux = setTimeout(function(){
               tabla
	            .column( dis.find('input').attr('data-name')+':name' )
	            .search( fecha )
	            .draw();
				$('.dataTables_paginate,.seperator').removeClass('hide');
        	},700);
		});
		/*************** MANEJA RANGO FECHAS ***************************/
		var sel = $('[data-toggle="dateTables"]');
		sel.find('.delFilter').die('click').live('click',function(e){
			$('.datepicker-dropdown').remove();
			$(this).parent().parent().find('input').attr('value','');
			$(this).parent().parent().find('input').trigger('changeDate');
		});
		sel.on('changeDate',function(){
			var dis = $(this);
			if(dis.find('input').attr('value')==''){
				dis.datepicker('update');
			}
			var wrapper = $(this).parent();
			var fechaIni = ($('input[name="order_date_from"]',wrapper).val()!='')?$('input[name="order_date_from"]',wrapper).val():null;
			var fechaFin = ($('input[name="order_date_to"]',wrapper).val()!='')?$('input[name="order_date_to"]',wrapper).val():null;

			if(typeof aux !== 'undefined'){
                clearTimeout(aux);
			}
			if(fechaIni != null || fechaFin != null){
	            aux = setTimeout(function(){
	               tabla
		            .column( dis.find('input').attr('data-name')+':name' )
		            .search( fechaIni+'|'+fechaFin )
		            .draw();
	        	},700);
			}else{
				aux = setTimeout(function(){
	               tabla
		            .column( dis.find('input').attr('data-name')+':name' )
		            .search( '' )
		            .draw();
	        	},700);
			}
		});
	};
	AjaxTables.prototype.setActions = function(obj,options) {
		var html = $(options.obj).parent().parent().parent().find('.table-actions-wrapper').html();
		$(options.obj).parent().parent().find('.table-group-actions').eq(0).html(html);
	};
	/********************** SET JQUERY FUNCTION ***********************************/
	$.fn.ajaxTables = function(options){
		if(typeof options == 'object'){
			var instances = [];
			this.each(function(i,v){
				instances[i] = new AjaxTables();
				instances[i].init(v,options);
			});
		}
	};
}(jQuery));
