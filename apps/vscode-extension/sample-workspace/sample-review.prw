/*/{Protheus.doc} PEASample
Offline sample used to demonstrate deterministic review evidence.
@type function
@author Protheus Engineering Agent
@since 2026-09-08
@return character Review status used by the offline walkthrough.
/*/
User Function PEASample()
    Local lApproved := .T.
    Local cStatus := Iif(lApproved, "approved", "rejected")
Return cStatus
