import { SupportEmailLink } from '../components/SupportEmailLink'
import { LegalPageShell } from './LegalPageShell'

export function TermsPage() {
  return (
    <LegalPageShell title="Kushtet e përdorimit">
      <p>
        Duke përdorur <strong>Inventari Im</strong> (web ose Android), ju pranoni këto kushte. Nëse
        nuk jeni dakord, mos e përdorni shërbimin.
      </p>

      <h2>1. Shërbimi</h2>
      <p>
        Inventari Im ofron mjete për regjistrimin e produkteve, stokut, veprimeve dhe raporteve.
        Shërbimi ofrohet “siç është”; ne përpiqemi për disponueshmëri të mirë por nuk garantojmë
        funksionim pa ndërprerje.
      </p>

      <h2>2. Llogaria</h2>
      <ul>
        <li>Jeni përgjegjës për fshehtësinë e fjalëkalimit dhe aktivitetin në llogarinë tuaj.</li>
        <li>Emri i përdoruesit duhet të jetë i vlefshëm dhe i juaji (ose i organizatës suaj).</li>
        <li>
          Nëse jeni administrator i një organizate, jeni përgjegjës për përdoruesit që krijoni,
          rolet, akseset sipas vendndodhjes dhe ndryshimet e kredencialeve që bëni për ta.
        </li>
        <li>Sesioni juaj i hyrjes skadon automatikisht pas 24 orësh; pas kësaj duhet të hyni përsëri.</li>
        <li>Mund të pezullojmë llogarinë në rast abuzimi ose shkeljeje të këtyre kushteve.</li>
      </ul>

      <h2>3. Të dhënat tuaja</h2>
      <p>
        Ju zotëroni të dhënat e inventarit që futni. Na jepni licencë të kufizuar për t’i ruajtur
        dhe përpunuar vetëm që t’ju ofrojmë shërbimin. Shihni{' '}
        <a href="/privacy">Politikën e privatësisë</a> për detaje.
      </p>

      <h2>4. Përdorimi i lejuar</h2>
      <p>Mos:</p>
      <ul>
        <li>përpiqeni të aksesoni llogari ose të dhëna të përdoruesve të tjerë;</li>
        <li>dëmtoni, ngarkoni ose anuloni serverin;</li>
        <li>përdorni shërbimin për qëllime të paligjshme.</li>
      </ul>

      <h2>5. Pagesa</h2>
      <p>
        Nëse aplikacioni ofrohet falas, nuk ka pagesë. Nëse në të ardhmen shtohen plane me pagesë,
        do t’ju njoftohet para se të aplikohen.
      </p>

      <h2>6. Përgjegjësia</h2>
      <p>
        Inventari Im ndihmon regjistrimin e stokut; vendimet e biznesit (blerje, shitje, tatime)
        mbeten përgjegjësia juaj. Ne nuk jemi përgjegjës për humbje indirekte nga përdorimi i
        aplikacionit, në masën e lejuar nga ligji.
      </p>

      <h2>7. Ndryshime dhe ndërprerje</h2>
      <p>
        Mund të ndryshojmë funksionalitetin ose këto kushte. Për ndryshime materiale do të
        përditësojmë datën në krye të faqes. Mund të ndalojmë shërbimin me njoftim arsyeshëm.
      </p>

      <h2>8. Ligji i zbatueshëm</h2>
      <p>
        Këto kushte rregullohen sipas ligjeve të Republikës së Shqipërisë, pa paragjykuar të
        drejtat tuaja si konsumator sipas ligjit lokal.
      </p>

      <h2>9. Kontakt</h2>
      <p>
        <SupportEmailLink fallback="adresa e emailit të mbështetjes në Google Play Console" />
      </p>
    </LegalPageShell>
  )
}
