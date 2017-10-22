'use strict'

const emailEl = _('email')
const subEl = _('sub')
const submitEl = _('submit')
const feedback = _('submit-feedback')
const reject = x => Promise.reject(x)
  // -> Ofc you CAN'T just pass Promise.reject... OOP is great, they say...

const toJSON = r => r.status !== 200 ? r.json().then(reject) : r.json()
const headers = {
  'Accept': 'application/json, text/plain, */*',
  'Content-Type': 'application/json',
}

const api = method => url => data =>
  fetch(`/api/${url}`, { body: JSON.stringify(data), headers, method })
    .then(toJSON)

const levenshtein = (a, b) => {
  if (a.length === 0) return b.length
  if (b.length === 0) return a.length
  let tmp, i, j, prev, val, row
  // swap to save some memory O(min(a,b)) instead of O(a)
  if (a.length > b.length) {
    tmp = a
    a = b
    b = tmp
  }

  row = Array(a.length + 1)
  // init the row
  for (i = 0; i <= a.length; i++) {
    row[i] = i
  }

  // fill in the rest
  for (i = 1; i <= b.length; i++) {
    prev = i
    for (j = 1; j <= a.length; j++) {
      if (b[i-1] === a[j-1]) {
        val = row[j-1] // match
      } else {
        val = Math.min(row[j-1] + 1, // substitution
              Math.min(prev + 1,     // insertion
                       row[j] + 1))  // deletion
      }
      row[j - 1] = prev
      prev = val
    }
    row[a.length] = prev
  }
  return row[a.length]
}

let whitelist = []
let blacklist = new Set()
fetch('/assets/misc/domain-list.txt')
  .then(r => r.text())
  .then(text => text.split('#disposable#').map(list => list.split('\n')))
  .then(([ w, b ]) => {
    whitelist = w.filter(Boolean).map(value => ({ value, score: 0 }))
    blacklist = new Set(b.filter(Boolean))
  })

const byScore = (a, b) => a.score - b.score
const findNearestPopularDomain = value => {
  if (!value) return { score: 0, value: '' }
  whitelist.forEach(word => word.score = levenshtein(value, word.value))
  return whitelist.sort(byScore)[0]
}

api.email = api('POST')('email')

const say = text => {
  feedback.classList.remove('error')
  feedback.textContent = text
}

const sayError = text => {
  feedback.classList.add('error')
  feedback.textContent = text
}

let preventSubmit = false
emailEl.onfocus = () => preventSubmit = false
const isInputValid = strict => {
  const [ , base, domain ] = emailEl.value.split(/(^[^@]+@)(.+)/)
  if (!domain) return sayError("Email invalide")
  if (blacklist.has(domain)) {
    return sayError('@'+ domain +" est bloqué")
  }
  if (strict) return true // skip domain sugestion
  const nearest = findNearestPopularDomain(domain)
  if ((domain !== nearest.value) && nearest.score < 5) {
    return say('c\'est pas plutôt '+ base + nearest.value +' ?')
  }
  return true
}

emailEl.onchange = () => {
  preventSubmit = true
  if (!isInputValid()) return emailEl.select()
  say('')
  preventSubmit = false
}

submitEl.onclick = () => {
  if (preventSubmit || submitEl.classList.contains('wait')) return false
  if (!isInputValid(true)) return emailEl.select()
  say('verification...')
  submitEl.classList.add('wait')
  api.email({ email: emailEl.value, sub: subEl.checked })
    .then(() => window.location.pathname = '/blog', err => {
      sayError(err.message)
      emailEl.select()
      submitEl.classList.remove('wait')
    })

  return false // disable classic form post
}

say('')
