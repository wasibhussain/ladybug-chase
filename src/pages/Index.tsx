import React from "react";
import BugRunner from "@/components/BugRunner";

const Index = () => {
  return (
    <main className="min-h-screen w-full">
      <section aria-labelledby="hero-title" className="relative">
        <h1 id="hero-title" className="sr-only">Red and Black Bug Runner - Interactive Playground</h1>
        <BugRunner />
      </section>
    </main>
  );
};

export default Index;
