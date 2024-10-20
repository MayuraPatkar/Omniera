gsap.registerPlugin(ScrollTrigger);


gsap.from("#container-3 .content", {
    duration: 2,
    opacity: 0,
    y: 60,
    stagger: 0.2,
    ease: "power2.out",
    scrollTrigger: {
        trigger: "#container-3 .content",
        start: "top 30%",
        end: "bottom 80%",
        scrub: 2,
        markers: true
    }
});

gsap.from("#container-3 .main-title-1", {
    opacity: 0,
    y: 100,
    duration: 2,
    ease: "power2.out",
    scrollTrigger: {
        trigger: "#container-3 .main-title-1",
        start: "top 60%",
        end: "bottom 80%",
        scrub: 2
    }
});
gsap.from(".container-6 .title-6", {
    opacity: 0,
    y: 100,
    duration: 2,
    ease: "power2.out",
    scrollTrigger: {
        trigger: ".container-6 .title-6",
        start: "top 60%",
        end: "bottom 80%",
        scrub: 2,
    }
});


var anim = gsap.timeline({
    scrollTrigger: {
        trigger: ".main-3",
        scroller: document.body,
        start: "top 60%",
        end: "top 0",
        scrub: 2
    }
});

anim.from(".elements.ele-1.left", {
    opacity: 0,
    x: -300,
    duration: 2
})
    .from(".elements.ele-1.right", {
        opacity: 0,
        x: 300,
        duration: 2
    })
    .from(".elements.ele-2.left", {
        opacity: 0,
        x: -300,
        duration: 2
    })
    .from(".elements.ele-2.right", {
        opacity: 0,
        x: 300,
        duration: 2
    });