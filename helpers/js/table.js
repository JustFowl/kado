var checkboxToggle = true
$('#toggle').click(function(){
  $('table.table td input').prop('checked',checkboxToggle)
  checkboxToggle = !checkboxToggle
})
$('#tableDelete').click(function(){
  if(!confirm('Are you sure you want to delete these items?')){
    return false
  }
})
$(document).ready(function(){
  $('[rel=tooltip]').tooltip()
})

window.DataTableConfig = function(tableName){
  if(!tableName) tableName = 'table'
  let removeClass = $('#' + tableName).attr('data-remove-class')
  let removeText = $('#' + tableName).attr('data-remove-text')
  let dataSrc = $('#' + tableName).attr('data-src')
  let serverSide = dataSrc !== 'local'
  let dtCfg = {
    dom: 'Bfrtip',
    buttons: [
      'copyHtml5',
      'excelHtml5',
      'pdfHtml5',
      'csvHtml5',
      'print',
      {
        text: removeText || 'Remove',
        className: removeClass || 'btn-danger',
        action: function(e,dt,node,config){
          let ids = $.map(dt.rows('.selected').data(),function(item){
            return item.id
          });
          let rowCount = ids.length;
          let confMsg = 'Are you sure you want to remove ' +
            rowCount + ' rows?';
          let removeUri = $('#' + tableName).attr('data-remove-uri');
          let removeKey = $('#' + tableName).attr('data-remove')

          let removeUrl = removeUri + '?' + removeKey + '=' + ids
          if(confirm(confMsg)){
            window.location.href = removeUrl
          }
          else{
            return e.preventDefault()
          }
        }
      }
    ],
    select: 'mutli',
    processing: serverSide,
    serverSide: serverSide,
    columns: (function(){
      let cols = []
      $('#table th').each(function(i){
        let that = this
        let dataName = $(that).attr('data-name')
        let dataFormat = $(that).attr('data-format')
        if(!dataName) return
        cols.push({
          name: $(that).text(),
          data: dataName,
          targets: i,
          render: function(data,type,row){
            let dataLink = $(that).attr('data-link')
            let dataUri = $(that).attr('data-uri')
            if(!dataLink && !dataFormat) return data
            if(dataLink){
              data = '<a href="' + dataUri + '?' + dataLink + '=' +
              row[dataLink] + '">' + data + '</a>'
            }
            if(dataFormat){
              data = window[dataFormat](data,type,row)
            }
            return data
          }
        })
      })
      return cols
    }())
  }
  if(serverSide) dtCfg.ajax = window.location.href
  return dtCfg
}
