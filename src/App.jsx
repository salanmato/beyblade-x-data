import './App.css';
import MatchForm from './components/MatchForm';
import MatchList from './components/MatchList';

export default function App() {
  return (
    <main>
      <header className="logo-container">
        <h1>
          BEYBLADE <span style={{ color: 'var(--green)' }}>X</span> TRACKER
        </h1>
      </header>

      <section>
        <article id="project-article">
          <MatchForm />
        </article>

        <article id="experience-article">
          <MatchList />
        </article>
      </section>
    </main>
  );
}
