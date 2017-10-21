'use strict'



let whitelist = new Set()
let blacklist = whitelist
const emailEl = _('email')
const parseList = list => new Set(list.split('/n'))
fetch('/assets/misc/domain-list.txt')
  .then(r => r.text())
  .then(text => text.split('#disposable#').map(parseList))
  .then(([ w, b ]) => (whitelist = w, blacklist = b))
setInterval(() => {
  emailEl
}, 48)
