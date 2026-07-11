import { SupportEmailLink } from '../components/SupportEmailLink'
import { LegalPageShell } from './LegalPageShell'

export function PrivacyPolicyPage() {
  return (
    <LegalPageShell title="Politika e privatësisë">
      <p>
        Kjo politikë shpjegon si <strong>Inventari Im</strong> (“ne”, “aplikacioni”) mbledh, përdor
        dhe mbron të dhënat tuaja kur përdorni faqen web dhe aplikacionin Android.
      </p>

      <h2>1. Kush jemi ne</h2>
      <p>
        Inventari Im është një shërbim inventari për menaxhimin e produkteve, stokut, veprimeve
        (hyrje/dalje/transfer) dhe historikut. Operatori i shërbimit është zhvilluesi i publikuar
        në Google Play Console për këtë aplikacion.
      </p>

      <h2>2. Çfarë të dhënash mbledhim</h2>
      <h3>Llogaria</h3>
      <ul>
        <li>
          <strong>Emri i përdoruesit (Emri)</strong> — për hyrje dhe identifikim në aplikacion.
        </li>
        <li>
          <strong>Fjalëkalimi</strong> — ruhet vetëm si hash i enkriptuar (bcrypt); ne nuk e
          ruajmë fjalëkalimin tuaj në tekst të qartë.
        </li>
        <li>
          <strong>Email (opsional)</strong> — kur hyni me Google ose me llogari që e ka email-in.
        </li>
        <li>
          <strong>Google ID</strong> — identifikuesi që Google na jep kur zgjidhni “Vazhdo me
          Google”.
        </li>
        <li>
          <strong>Preferenca llogarisë</strong> — p.sh. onboarding i përfunduar, tutorial i parë,
          ndjekja e çmimeve (on/off).
        </li>
        <li>
          <strong>Roli dhe aksesi</strong> — nëse përdorni llogari organizate, ruajmë rolin
          (Admin/Përdorues) dhe aksesin sipas vendndodhjes që cakton administratori.
        </li>
      </ul>

      <h3>Të dhënat e biznesit që ju i futni</h3>
      <ul>
        <li>Produkte (kod, emër, sasi, çmim opsional)</li>
        <li>Vendndodhje / depo</li>
        <li>Veprime inventari (hyrje, dalje, transfer), data, shënime</li>
        <li>Historik dhe përmbledhje që gjenerohen nga këto të dhëna</li>
      </ul>
      <p>
        Ne <strong>nuk</strong> mbledhim qëllimisht vendndodhjen GPS, numrin e telefonit, kontaktet
        e telefonit apo foto nga pajisja.
      </p>

      <h3>Teknike</h3>
      <ul>
        <li>
          <strong>Cookie sesioni</strong> (<code>inventari_session</code>) — për të mbajtur hyrjen
          tuaj (HTTP-only; skadon automatikisht pas 24 orësh ose kur dilni nga llogaria).
        </li>
        <li>
          <strong>Ruajtje lokale në shfletues</strong> — preferenca të vogla UI (p.sh. vendi i
          zgjedhur, modaliteti mobil).
        </li>
        <li>
          <strong>Regjistra serveri</strong> — adresa IP dhe kërkesa HTTP mund të regjistrohen nga
          hosti (Render) për siguri dhe diagnostikë.
        </li>
      </ul>

      <h2>3. Si i përdorim të dhënat</h2>
      <ul>
        <li>T’ju ofrojmë hyrjen dhe shërbimin e inventarit.</li>
        <li>T’i ruajmë dhe shfaqim produktet, stokun dhe historinë tuaj.</li>
        <li>T’ju lejojmë shkarkimin e raporteve (Excel, PDF, Word, CSV) që keni kërkuar.</li>
        <li>Të mbrojmë shërbimin nga abuzimi dhe të diagnostikojmë gabime.</li>
      </ul>
      <p>
        Ne <strong>nuk</strong> shesim të dhënat tuaja, <strong>nuk</strong> përdorim reklama dhe{' '}
        <strong>nuk</strong> përdorim analitikë marketingu (Google Analytics, etj.) në kodin e
        aplikacionit.
      </p>

      <h2>4. Palë të treta</h2>
      <ul>
        <li>
          <strong>Supabase</strong> — bazë e të dhënave ku ruhen llogaria dhe të dhënat e inventarit.
        </li>
        <li>
          <strong>Render</strong> — hoston API-në dhe faqen web të aplikacionit.
        </li>
        <li>
          <strong>Google</strong> — vetëm nëse zgjidhni hyrjen me Google; Google përpunon
          identitetin tuaj sipas{' '}
          <a href="https://policies.google.com/privacy" target="_blank" rel="noopener noreferrer">
            politikës së privatësisë së Google
          </a>
          .
        </li>
        <li>
          <strong>Google Play</strong> — distribuon aplikacionin Android; rregullat e Play Store
          zbatohen për instalimin dhe pagesat (nëse ka).
        </li>
      </ul>

      <h2>5. Ruajtja</h2>
      <p>
        Të dhënat e inventarit ruhen derisa t’i fshini ju ose derisa të mbyllni llogarinë. Cookie e
        sesionit skadon automatikisht pas 24 orësh. Kopjet rezervë të bazës së të dhënave mund të
        ekzistojnë te Supabase sipas konfigurimit të tyre.
      </p>

      <h2>6. Siguria</h2>
      <p>
        Përdorim HTTPS në prodhim, fjalëkalime të hash-uara, cookie sesioni të nënshkruar, dhe
        izolim të të dhënave sipas llogarisë, rolit dhe aksesit që ka përdoruesi.
      </p>

      <h2>7. Të drejtat tuaja</h2>
      <p>Mund të kërkoni:</p>
      <ul>
        <li>qasje në të dhënat e llogarisë suaj;</li>
        <li>korrigjim të të dhënave të pasakta;</li>
        <li>fshirje të llogarisë dhe të dhënave (me email te mbështetja).</li>
      </ul>
      <p>
        Për kërkesa, na shkruani te{' '}
        <SupportEmailLink fallback="adresa e emailit të mbështetjes në Google Play Console" />
        . Përgjigjemi brenda një afati arsyeshëm (zakonisht 30 ditë).
      </p>

      <h2>8. Fëmijët</h2>
      <p>
        Shërbimi nuk drejtohet për fëmijë nën 13 vjeç. Nuk mbledhim qëllimisht të dhëna nga fëmijë.
      </p>

      <h2>9. Aplikacioni Android</h2>
      <ul>
        <li>Kërkon lejen <strong>INTERNET</strong> për të komunikuar me serverin.</li>
        <li>
          Mund të përdorë hyrjen me Google (nëse e aktivizoni); kërkon llogari Google në pajisje.
        </li>
        <li>
          Android mund të lejojë kopje rezervë të të dhënave të aplikacionit nëse e keni aktivizuar
          backup-in e pajisjes — kontrolloni cilësimet e telefonit.
        </li>
      </ul>

      <h2>10. Ndryshime</h2>
      <p>
        Këtë politikë mund ta përditësojmë. Data “Përditësuar” në krye tregon versionin aktual.
        Përdorimi i vazhdueshëm pas ndryshimeve do të thotë pranim i politikës së re.
      </p>

      <h2>11. Kontakt</h2>
      <p>
        Pyetje për privatësinë: <SupportEmailLink fallback="Google Play Console" />
      </p>
    </LegalPageShell>
  )
}
