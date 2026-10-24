import { describe, expect, it } from 'vitest'
import { patientAddressText, patientProfileReadyForPayment } from './patient-profile'

const contact = {
  first_name:'Paciente',last_name:'Prueba',email:'qa@example.invalid',phone:'+593 99 123 4567',
  address:{street:'Calle de prueba',line2:'',city:'Quito',state:'',postalCode:'',country:'Ecuador'},
}

describe('patient profile required before QBO invoice issuance',() => {
  it('accepts an international address without state or postal code',() => {
    expect(patientAddressText(contact.address)).toBe('Calle de prueba, Quito, Ecuador')
    expect(patientProfileReadyForPayment(contact)).toBe(true)
  })

  it('holds an incomplete profile before payment can be offered',() => {
    expect(patientProfileReadyForPayment({...contact,phone:null})).toBe(false)
    expect(patientProfileReadyForPayment({...contact,address:null})).toBe(false)
    expect(patientProfileReadyForPayment({...contact,address:{...contact.address,city:''}})).toBe(false)
  })
})
