exports.myDateTime = () => {
    const date = new Date()
    const hour = date.getHours()===12 || date.getHours()===0 ? 12 : date.getHours()%12
    const minute = String(date.getMinutes()).padStart(2,"0")
    const meridian = date.getHours() < 12 ? 'AM' : 'PM'
    return `${hour}:${minute}${meridian}`
}