let pvData = pv;
let htmlData = html;

let epiData = epi;
let ipsData = ips;

let getSpecification = () => {
    return "1.0.0";
};

// Utility: Detect language from ePI
function detectLanguage(epiData) {
    let languageDetected = null;
    if (epiData && epiData.entry) {
        epiData.entry.forEach((entry) => {
            const res = entry.resource;
            if (res?.resourceType === "Composition" && res.language) {
                languageDetected = res.language;
            }
        });
    }
    if (!languageDetected && epiData && epiData.language) {
        languageDetected = epiData.language;
    }
    return languageDetected;
}

// Utility: Check for relevant extension in ePI by system/code
function hasRelevantExtension(epiData, listOfCategoriesToSearch) {
    if (!epiData || !epiData.entry) return false;
    for (const entry of epiData.entry) {
        if (entry.resource.resourceType === "Composition" && Array.isArray(entry.resource.extension)) {
            for (const element of entry.resource.extension) {
                if (element.extension && element.extension[1]?.url === "concept") {
                    const codings = element.extension[1].valueCodeableReference?.concept?.coding || [];
                    for (const coding of codings) {
                        if (listOfCategoriesToSearch.some(item => item.code === coding.code && item.system === coding.system)) {
                            return true;
                        }
                    }
                }
            }
        }
    }
    return false;
}

const insertCheckListLink = (listOfCategories, language, document, response) => {
    let checklist = "";
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
    listOfCategories.forEach((className) => {
        if (
            response.includes(`class="${className}`) ||
            response.includes(`class='${className}`)
        ) {
            const elements = document.getElementsByClassName(className);
            for (let i = 0; i < elements.length; i++) {
                const el = elements[i];
                const link = document.createElement("a");
                link.setAttribute("href", linkHTML);
                link.setAttribute("target", "_blank");
                link.setAttribute("class", "questionnaire-lens");
                if (shouldAppend) {
                    link.innerHTML = "📝 Fill out safety questionnaire";
                    el.appendChild(link);
                } else {
                    link.innerHTML = el.innerHTML;
                    el.innerHTML = "";
                    el.appendChild(link);
                }
            }
            foundCategory = true;
        }
    });
    // No matching category tags → inject banner at top
    if (!foundCategory) {
        const bannerDiv = document.createElement("div");
        bannerDiv.innerHTML = checklist;
        const body = document.querySelector("body");
        if (body) {
            body.insertBefore(bannerDiv, body.firstChild);
        }
    }
    // Clean head
    if (document.getElementsByTagName("head").length > 0) {
        document.getElementsByTagName("head")[0].remove();
    }
    // Extract HTML result
    if (document.getElementsByTagName("body").length > 0) {
        response = document.getElementsByTagName("body")[0].innerHTML;
    } else {
        response = document.documentElement.innerHTML;
    }
    if (!response || response.trim() === "") {
        throw new Error("Annotation process failed: empty or null response");
    }
    return response;
};

let enhance = async () => {
    // Check for valid epi and ips
    if (!epiData || !epiData.entry || epiData.entry.length === 0) {
        throw new Error("ePI is empty or invalid.");
    }
    if (!ipsData || !ipsData.entry || ipsData.entry.length === 0) {
        throw new Error("IPS is empty or invalid.");
    }
    // Match lists
    const BUNDLE_IDENTIFIER_LIST = ["epibundle-123", "epibundle-abc"];
    const PRODUCT_IDENTIFIER_LIST = ["CIT-204447", "RIS-197361"];
    let listOfCategoriesToSearch = [{ "code": "grav-4", "system": "https://www.gravitatehealth.eu/sid/doc" }];
    // Detect language
    let languageDetected = detectLanguage(epiData);
    if (!languageDetected) {
        console.warn("⚠️ No language detected in Composition or Bundle.");
    }
    // Check for relevant extension in ePI
    let hasExtension = hasRelevantExtension(epiData, listOfCategoriesToSearch);
    // Check bundle.identifier.value
    let matchFound = false;
    if (
        epiData.identifier &&
        BUNDLE_IDENTIFIER_LIST.includes(epiData.identifier.value)
    ) {
        matchFound = true;
    }
    // Check MedicinalProductDefinition.identifier.value
    epiData.entry.forEach((entry) => {
        const res = entry.resource;
        if (res?.resourceType === "MedicinalProductDefinition") {
            const ids = res.identifier || [];
            ids.forEach((id) => {
                if (PRODUCT_IDENTIFIER_LIST.includes(id.value)) {
                    matchFound = true;
                }
            });
        }
    });
    // ePI translation from terminology codes to their human readable translations in the sections
    let compositions = 0;
    let categories = [];
    epiData.entry.forEach((entry) => {
        if (entry.resource.resourceType == "Composition") {
            compositions++;
            entry.resource.extension.forEach((element) => {
                if (element.extension && element.extension[1]?.url == "concept") {
                    if (element.extension[1].valueCodeableReference.concept != undefined) {
                        element.extension[1].valueCodeableReference.concept.coding.forEach(
                            (coding) => {
                                if (listOfCategoriesToSearch.some(item => item.code === coding.code && item.system === coding.system)) {
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
    if (!matchFound ) {
        // No match, just return html
        return htmlData;
    }
    // Apply checklist/banner
    let response = htmlData;
    let document;
    if (typeof window === "undefined") {
        let jsdom = await import("jsdom");
        let { JSDOM } = jsdom;
        let dom = new JSDOM(htmlData);
        document = dom.window.document;
        return insertCheckListLink(categories, languageDetected, document, response);
    } else {
        document = window.document;
        return insertCheckListLink(categories, languageDetected, document, response);
    }
};

return {
    enhance: enhance,
    getSpecification: getSpecification,
};