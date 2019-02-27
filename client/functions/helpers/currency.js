// source: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/NumberFormat
function formatMoney(number) {
  let money = new Intl.NumberFormat(['ban', 'id'], { maximumFractionDigits: 0 }).format(number)
  return money;
}

function getTotalTransaction(selectedServices) {
  let totalTransaction = 0
  selectedServices && selectedServices.map((service) => {
    totalTransaction = totalTransaction + Number(service.price)
    return ''
  })
  return totalTransaction
}


module.exports = {
  formatMoney,
  getTotalTransaction
}