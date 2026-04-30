import { motion } from "framer-motion";
import { useRef, useState } from "react";
import { Link } from "react-router-dom";
import MarketingHeader from "../components/MarketingHeader";
import aboutHero from "../assets/about_hero.png";
import ckriptVideo from "../assets/ckript-video.mp4";

const FontInjection = () => (
	<style>{`
		@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400..900;1,400..900&family=Inter:wght@300;400;500;600;700&display=swap');

		.font-display { font-family: 'Playfair Display', Georgia, serif; }
		.font-body { font-family: 'Inter', system-ui, sans-serif; }
	`}</style>
);

const About = () => {
	const [isVideoPlaying, setIsVideoPlaying] = useState(false);
	const videoRef = useRef(null);

	const handleVideoOverlayClick = () => {
		const video = videoRef.current;
		if (!video) return;

		setIsVideoPlaying(true);
		const playPromise = video.play();
		if (playPromise && typeof playPromise.catch === "function") {
			playPromise.catch(() => setIsVideoPlaying(false));
		}
	};

	return (
		<div className="relative min-h-screen overflow-x-hidden bg-[#0A0A0B] text-white">
			<FontInjection />
			<div className="pointer-events-none fixed inset-0 z-0">
				<div className="absolute inset-0 bg-[radial-gradient(circle_at_16%_0%,rgba(255,255,255,0.03),transparent_28%),radial-gradient(circle_at_84%_22%,rgba(255,255,255,0.02),transparent_20%)]" />
			</div>

			<MarketingHeader />

			<section className="relative z-10 px-4 pb-12 pt-28 sm:px-8 sm:pb-16 sm:pt-32">
				<div className="mx-auto w-full max-w-6xl">
					<p className="font-body flex w-full justify-center text-center px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.28em] text-white/60 mb-5">
						About Ckript
					</p>

					<div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-5 lg:gap-10">
						<motion.div
							initial={{ opacity: 0, y: 12 }}
							animate={{ opacity: 1, y: 0 }}
							transition={{ duration: 0.45 }}
							className="hidden lg:col-span-3 lg:block"
						>
							<h1 className="font-display text-4xl leading-[1.02] tracking-tight sm:text-5xl lg:text-6xl text-white font-medium">
								About <span className="text-[#BAE6FD]">Ckript</span>
							</h1>
							<p className="font-body mt-5 text-base leading-relaxed text-white/70 sm:text-lg">
								Ckript is a next-generation digital platform designed to bridge the gap between talented storytellers and industry decision-makers. It enables writers to create and showcase scripts across multiple formats, including films, web series, anime, television, cartoons, and more, within a secure and structured ecosystem.
							</p>
							<p className="font-body mt-3 text-base leading-relaxed text-white/70 sm:text-lg">
								At its core, Ckript is built to solve one of the biggest challenges in the entertainment industry: discoverability with trust.
							</p>
							<p className="font-body mt-3 text-base leading-relaxed text-white/70 sm:text-lg">
								Every script uploaded to the platform is securely protected to ensure full ownership and intellectual property safety for writers. To enhance visibility and evaluation, Ckript leverages advanced AI to transform scripts into visual trailers and generate insightful evaluation scores, enabling faster and more informed decision-making.
							</p>
							<p className="font-body mt-3 text-base leading-relaxed text-white/70 sm:text-lg">
								Producers and directors can seamlessly explore curated content through trailers, structured insights, and concise summaries. Based on this initial evaluation, they can request access to full scripts, ensuring that only serious and relevant interest leads to deeper engagement.
							</p>
						</motion.div>

						<motion.div
							initial={{ opacity: 0, y: 14 }}
							animate={{ opacity: 1, y: 0 }}
							transition={{ duration: 0.45, delay: 0.1 }}
							className="relative overflow-hidden rounded-3xl border border-white/10 bg-white/[0.02] min-h-[620px] sm:min-h-[700px] md:min-h-[760px] lg:min-h-[250px] lg:col-span-2 max-[510px]:min-h-0 max-[510px]:bg-transparent max-[510px]:border-none"
						>
							<img
								src={aboutHero}
								alt="Ckript marketplace visual"
								className="h-full min-h-[250px] w-full object-cover max-[510px]:hidden filter brightness-75 contrast-125"
								loading="eager"
							/>

							<div className="absolute inset-0 z-10 bg-gradient-to-t from-[#0A0A0B] via-[#0A0A0B]/80 to-transparent p-5 text-white overflow-y-auto sm:p-8 lg:hidden max-[510px]:static max-[510px]:inset-auto max-[510px]:overflow-visible max-[510px]:bg-transparent max-[510px]:p-0">
								<h1 className="font-display text-4xl leading-[1.02] tracking-tight sm:text-5xl text-white font-medium">
									About <span className="text-[#BAE6FD]">Ckript</span>
								</h1>
								<p className="font-body mt-5 text-base leading-relaxed text-white/70 sm:text-lg">
									Ckript is a next-generation digital platform designed to bridge the gap between talented storytellers and industry decision-makers. It enables writers to create and showcase scripts across multiple formats, including films, web series, anime, television, cartoons, and more, within a secure and structured ecosystem.
								</p>
								<p className="font-body mt-3 text-base leading-relaxed text-white/70 sm:text-lg">
									At its core, Ckript is built to solve one of the biggest challenges in the entertainment industry: discoverability with trust.
								</p>
								<p className="font-body mt-3 text-base leading-relaxed text-white/70 sm:text-lg">
									Every script uploaded to the platform is securely protected to ensure full ownership and intellectual property safety for writers. To enhance visibility and evaluation, Ckript leverages advanced AI to transform scripts into visual trailers and generate insightful evaluation scores, enabling faster and more informed decision-making.
								</p>
								<p className="font-body mt-3 text-base leading-relaxed text-white/70 sm:text-lg">
									Producers and directors can seamlessly explore curated content through trailers, structured insights, and concise summaries. Based on this initial evaluation, they can request access to full scripts, ensuring that only serious and relevant interest leads to deeper engagement.
								</p>
							</div>
						</motion.div>
					</div>
				</div>
			</section>

			<section className="relative z-10 px-4 pb-10 sm:px-8 sm:pb-14">
				<div className="mx-auto w-full max-w-6xl">
					<motion.div
						initial={{ opacity: 0, y: 14 }}
						whileInView={{ opacity: 1, y: 0 }}
						viewport={{ once: true }}
						transition={{ duration: 0.45 }}
						className="mb-6 sm:mb-8 text-center"
					>
						<p className="font-body text-xs font-semibold uppercase tracking-[0.28em] text-white/60">
							Guiding Principles
						</p>
						<h2 className="font-display mt-2 text-4xl leading-tight text-white sm:text-5xl font-medium">
							Mission <em className="text-white/70">and</em> Vision
						</h2>
					</motion.div>

					<div className="grid grid-cols-1 gap-5 md:grid-cols-2">
						<motion.article
							initial={{ opacity: 0, y: 16 }}
							whileInView={{ opacity: 1, y: 0 }}
							viewport={{ once: true }}
							transition={{ duration: 0.45 }}
							className="group relative overflow-hidden rounded-3xl border border-white/10 bg-white/[0.04] p-8 sm:p-10 transition-all duration-300 hover:border-white/20 hover:bg-white/[0.06]"
						>
							<div className="relative z-10">
								<span className="font-body inline-flex items-center rounded-full border border-white/20 bg-white/10 px-4 py-1.5 text-xs font-semibold tracking-[0.24em] text-white">
									01 • Our Mission
								</span>
								<p className="font-body mt-6 text-base leading-relaxed text-white/70 sm:text-lg">
									Our mission is to build a trusted, intelligent ecosystem where great stories are discovered on merit, creators retain full control of their work, and industry professionals can efficiently access high-quality, production-ready content.
								</p>
							</div>
						</motion.article>

						<motion.article
							initial={{ opacity: 0, y: 16 }}
							whileInView={{ opacity: 1, y: 0 }}
							viewport={{ once: true }}
							transition={{ duration: 0.45, delay: 0.08 }}
							className="group relative overflow-hidden rounded-3xl border border-white/10 bg-white/[0.04] p-8 sm:p-10 transition-all duration-300 hover:border-white/20 hover:bg-white/[0.06]"
						>
							<div className="relative z-10">
								<span className="font-body inline-flex items-center rounded-full border border-white/20 bg-white/10 px-4 py-1.5 text-xs font-semibold tracking-[0.24em] text-white">
									02 • Our Vision
								</span>
								<p className="font-body mt-6 text-base leading-relaxed text-white/70 sm:text-lg">
									Our vision is to redefine the entertainment ecosystem by making script discovery intelligent, secure, and accessible, unlocking opportunities for creators and reshaping how content is found and produced worldwide.
								</p>
							</div>
						</motion.article>
					</div>
				</div>
			</section>

			<section className="relative z-10 px-4 pb-10 sm:px-8 sm:pb-14">
				<div className="mx-auto w-full max-w-6xl overflow-hidden rounded-[2rem] border border-white/10 bg-[#0A0A0B] shadow-[0_28px_80px_rgba(0,0,0,0.5)]">
					<div className="relative">
						<video
							ref={videoRef}
							controls
							controlsList="nodownload"
							playsInline
							preload="metadata"
							onPlay={() => setIsVideoPlaying(true)}
							onPause={() => setIsVideoPlaying(false)}
							onEnded={() => setIsVideoPlaying(false)}
							className="h-full max-h-[560px] w-full bg-black"
							aria-label="How to use Ckript platform video"
						>
							<source src={ckriptVideo} type="video/mp4" />
							Your browser does not support the video tag.
						</video>

						<div
							className={`absolute inset-0 transition-opacity duration-300 ${isVideoPlaying ? "opacity-0 pointer-events-none" : "opacity-100"}`}
						>
							<div className="absolute inset-0 bg-[#0A0A0B]/80 backdrop-blur-sm" />
							<button
								type="button"
								onClick={handleVideoOverlayClick}
								className="relative z-10 flex h-full w-full items-center justify-center p-5 text-center sm:p-8"
								aria-label="Play platform walkthrough video"
							>
								<div className="max-w-3xl">
									<div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full border border-white/30 bg-white/10 text-white backdrop-blur-md transition-transform hover:scale-110">
										<svg viewBox="0 0 24 24" className="h-6 w-6 ml-1" fill="currentColor" aria-hidden="true">
											<path d="M8 6v12l10-6z" />
										</svg>
									</div>
									<h2 className="font-display text-4xl leading-tight text-white sm:text-5xl font-medium">
										How to Use the Platform
									</h2>
									<p className="font-body mt-4 text-base leading-relaxed text-white/70 sm:text-lg">
										Watch this quick walkthrough to understand how writers can upload securely and how producers can discover and evaluate scripts efficiently.
									</p>
								</div>
							</button>
						</div>
					</div>
				</div> 
			</section>

			<footer className="relative z-10 border-t border-white/10 bg-[#0A0A0B] px-4 py-8 sm:px-8 sm:py-10">
				<div className="mx-auto flex w-full max-w-7xl flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
					<div>
						<p className="font-body mt-1 text-sm text-white/50">&copy; 2026 Ckript. All rights reserved.</p>
					</div>

					<div className="font-body flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-white/50">
						<Link to="/about" className="transition-colors hover:text-white">About</Link>
						<Link to="/contact" className="transition-colors hover:text-white">Contact</Link>
						<Link to="/privacy-policy" className="transition-colors hover:text-white">Privacy Policy</Link>
						<Link to="/terms-of-service" className="transition-colors hover:text-white">Terms of Service</Link>
					</div>
				</div>
			</footer>

		</div>
	);
};

export default About;
