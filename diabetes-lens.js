
let pvData = pv
let htmlData = html

let epiData = epi;
let ipsData = ips;

let getSpecification = () => {
    return "1.0.0"
}

//for future use?
function loadChecklist(language) {
    if (languageDetected?.startsWith("pt")) {
        filename = "checklist-pt.html";
    } else if (languageDetected?.startsWith("en")) {
        filename = "checklist-pt.html";
    } else { //should we have this?
        filename = "checklist-pt.html";
    }

    const targetElement = document.getElementById("checklist-container");
    if (!targetElement) {
        console.warn("🛑 Checklist container not found.");
        return;
    }

    fetch(`checklists/${filename}`)
        .then((response) => {
            if (!response.ok) throw new Error("Failed to load checklist.");
            return response.text();
        })
        .then((html) => {
            targetElement.innerHTML = html;
            console.log(`✅ Loaded checklist: ${filename}`);
        })
        .catch((error) => {
            console.error("❌ Error loading checklist:", error);
        });
}



const insertCheckListLink = (listOfCategories,language, document, response) => {

    if (language?.startsWith("pt")) {
        checklist = `
        <div class="checklist">
          <h3>📋 Lista de Verificação</h3>
          <p>Este medicamento pode ser complicado de usar, por isso aqui está uma lista de verificação para se lembrar do que verificar antecipadamente.</p>
          <ul>
            <li><label><input type="checkbox"> Rever lista de medicação</label></li>
            <li><label><input type="checkbox"> Confirmar alergias do paciente</label></li>
            <li><label><input type="checkbox"> Enviar e-mail de seguimento</label></li>
            <li><label><input type="checkbox"> Atualizar histórico clínico</label></li>
            <li><label><input type="checkbox"> Marcar próxima consulta</label></li>
          </ul>
        </div>
      `;
    } else if (language?.startsWith("en")) {
        checklist = `
        <div class="checklist">
  <h3>📋 Checklist</h3>
  <p>This Drug can be complicated to use, so here is a checklist for you to remember to check things before.</p>
  <ul>
    <li><label><input type="checkbox"> Review medication list</label></li>
    <li><label><input type="checkbox"> Confirm patient allergies</label></li>
    <li><label><input type="checkbox"> Send follow-up email</label></li>
    <li><label><input type="checkbox"> Update medical history</label></li>
    <li><label><input type="checkbox"> Schedule next appointment</label></li>
  </ul>
</div>
      `;
    } else if (language?.startsWith("es")) {
        checklist = `
        <div class="checklist">
          <h3>📋 Lista de Comprobación</h3>
          <p>Este medicamento puede ser complicado de usar, así que aquí tienes una lista de comprobación para recordar lo que debes revisar antes.</p>
          <ul>
            <li><label><input type="checkbox"> Revisar lista de medicamentos</label></li>
            <li><label><input type="checkbox"> Confirmar alergias del paciente</label></li>
            <li><label><input type="checkbox"> Enviar correo de seguimiento</label></li>
            <li><label><input type="checkbox"> Actualizar historial médico</label></li>
            <li><label><input type="checkbox"> Programar próxima cita</label></li>
          </ul>
        </div>
      `;
    } else if (language?.startsWith("da")) {
        checklist = `
        <div class="checklist">
          <h3>📋 Tjekliste</h3>
          <p>Denne medicin kan være kompliceret at bruge, så her er en tjekliste, der kan hjælpe dig med at huske, hvad du skal kontrollere.</p>
          <ul>
            <li><label><input type="checkbox"> Gennemgå medicinliste</label></li>
            <li><label><input type="checkbox"> Bekræft patientens allergier</label></li>
            <li><label><input type="checkbox"> Send opfølgende e-mail</label></li>
            <li><label><input type="checkbox"> Opdater medicinsk historik</label></li>
            <li><label><input type="checkbox"> Planlæg næste aftale</label></li>
          </ul>
        </div>
      `;
    } 
    let foundCategory = false;
    console.log(listOfCategories)
    console.log(listOfCategories.length)

    // No matching category tags → inject banner at top
    if (!foundCategory) {
        const bannerDiv = document.createElement("div");
        bannerDiv.innerHTML = checklist

        const body = document.querySelector("body");
        if (body) {
            body.insertBefore(bannerDiv, body.firstChild);
        }
    }

    // Clean head (same as your original logic)
    if (document.getElementsByTagName("head").length > 0) {
        document.getElementsByTagName("head")[0].remove();
    }

    // Extract HTML result
    if (document.getElementsByTagName("body").length > 0) {
        response = document.getElementsByTagName("body")[0].innerHTML;
        console.log("Response: " + response);
    } else {
        console.log("Response: " + document.documentElement.innerHTML);
        response = document.documentElement.innerHTML;
    }

    if (!response || response.trim() === "") {
        throw new Error("Annotation process failed: empty or null response");
    }

    return response;
};

let enhance = async () => {

    if (!epiData || !epiData.entry || epiData.entry.length === 0) {
        throw new Error("ePI is empty or invalid.");
    }
    // Match lists
    const BUNDLE_IDENTIFIER_LIST = ["epibundle-123", "epibundle-abc"]; //drugs for diabetes
    const PRODUCT_IDENTIFIER_LIST = ["CIT-204447", "RIS-197361"];//drugs for diabetes

    
    let matchFound = false;
    let languageDetected = null;

    // 1. Check Composition.language
    epiData.entry?.forEach((entry) => {
        const res = entry.resource;
        if (res?.resourceType === "Composition" && res.language) {
            languageDetected = res.language;
            console.log("🌍 Detected from Composition.language:", languageDetected);
        }
    });
    
    // 2. If not found, check Bundle.language
    if (!languageDetected && epiData.language) {
        languageDetected = epiData.language;
        console.log("🌍 Detected from Bundle.language:", languageDetected);
    }
    
    // 3. Fallback message
    if (!languageDetected) {
        console.warn("⚠️ No language detected in Composition or Bundle.");
    }
    
    // Check bundle.identifier.value
    if (
        epiData.identifier &&
        BUNDLE_IDENTIFIER_LIST.includes(epiData.identifier.value)
    ) {
        console.log("🔗 Matched ePI Bundle.identifier:", epiData.identifier.value);
        matchFound = true;
    }

    // Check MedicinalProductDefinition.identifier.value
    epiData.entry.forEach((entry) => {
        const res = entry.resource;
        if (res?.resourceType === "MedicinalProductDefinition") {
            const ids = res.identifier || [];
            ids.forEach((id) => {
                if (PRODUCT_IDENTIFIER_LIST.includes(id.value)) {
                    console.log("💊 Matched MedicinalProductDefinition.identifier:", id.value);
                    matchFound = true;
                }
            });
        }
    });

    // ePI traslation from terminology codes to their human redable translations in the sections
    // in this case, if is does not find a place, adds it to the top of the ePI
    let compositions = 0;
    let categories = [];
    epi.entry.forEach((entry) => {
        if (entry.resource.resourceType == "Composition") {
            compositions++;
            //Iterated through the Condition element searching for conditions
            entry.resource.extension.forEach((element) => {

                // Check if the position of the extension[1] is correct
                if (element.extension[1].url == "concept") {
                    // Search through the different terminologies that may be avaible to check in the condition
                    if (element.extension[1].valueCodeableReference.concept != undefined) {
                        element.extension[1].valueCodeableReference.concept.coding.forEach(
                            (coding) => {
                                console.log("Extension: " + element.extension[0].valueString + ":" + coding.code)
                                // Check if the code is in the list of categories to search
                                if (listOfCategoriesToSearch.includes(coding.code)) {
                                    // Check if the category is already in the list of categories
                                    categories.push(element.extension[0].valueString);
                                }
                            }
                        );
                    }
                }
            });
        }
    });
    if (compositions == 0) {
        throw new Error('Bad ePI: no category "Composition" found');
    }

    if (!matchFound) {
        console.log("ePI is not for a medication requiring checklist");
        return htmlData;
    }

    else {


        let response = htmlData;
        let document;

        if (typeof window === "undefined") {
            let jsdom = await import("jsdom");
            let { JSDOM } = jsdom;
            let dom = new JSDOM(htmlData);
            document = dom.window.document;
            return insertCheckListLink(categories, languageDetected,document, response);
            //listOfCategories, enhanceTag, document, response
        } else {
            document = window.document;
            return insertCheckListLink(categories,languageDetected, document, response);
        }
    };
};

return {
    enhance: enhance,
    getSpecification: getSpecification,
};